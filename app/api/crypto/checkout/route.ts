/**
 * POST /api/crypto/checkout
 *
 * Creates pending orders (server-priced) and a fixed-amount crypto session,
 * OR processes immediate eSIM Cash payments if coin is 'ESIM_CASH'.
 * Body: { email, coin, items: { tariffId, quantity, days? }[] }
 * Returns: { sessionId?, ref }
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { clampDays } from '@/lib/quote';
import { isUuid }                from '@/lib/utils';
import { resolveCustomer }     from '@/lib/customers';
import { createCryptoSession } from '@/lib/crypto/session';
import { getCoin }             from '@/lib/crypto/coins';
import { fulfillOrders }       from '@/lib/fulfillment';
import { sendCheckoutNotificationEmail } from '@/lib/email/mailer';
import { fetchTopUpPackages, priceToUsd, bytesToGb, getVolumeBytes } from '@/lib/esimaccess/client';
import { calculateSalePrice, getDayPassPrice }  from '@/lib/pricing';
import { calculateOrderPricing, getActivePromotion, type Promotion } from '@/lib/pricing-service';
import { getNow } from '@/lib/time';
import { validateEmail }        from '@/lib/validation/email';
import { isValidLocale }        from '@/lib/i18n/config';
import { getServerDict }        from '@/lib/i18n/server';
import { formatCurrencyEuro }   from '@/lib/currency';
import { getTopUpEligibility, getEsimRecord, hasPendingTopUpSession } from '@/lib/topup';
import { formatFullCheckoutTariffName, formatLocalizedTariffName, displayCountryName } from '@/lib/tariff-display';
import {
  authenticateVerifiedCashUser,
  executeEsimCashCheckout,
  refundFailedEsimCashOrder,
  type CashOrderLineInput,
} from '@/lib/esim-cash';
import { getEffectiveAccountStatus, getAccountLockMessage } from '@/lib/auth/accountStatus';

export const runtime = 'nodejs';

/**
 * Valid terms & privacy policy version (matches 'Last updated: June 2026' on /agb).
 * NOTE: Must be updated whenever Terms or Privacy Policy are changed.
 */
const TERMS_VERSION = '2026-06';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ReqItem { tariffId: string; quantity: number; days?: number; topUpIccid?: string }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, coin, items, referredBy, termsAccepted, expectedTotalCents } = body as {
      email?:         string;
      coin?:          string;
      items?:         ReqItem[];
      referredBy?:    string;
      termsAccepted?: boolean;
      termsVersion?:  string;
      expectedTotalCents?: number;
      customerLocale?: string;
      locale?: string;
      newsletterConsent?: boolean;
    };

    // 1. Strict Email Validation (checked before any DB/order creation or payment calls)
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: 'INVALID_EMAIL', field: 'email' }, { status: 422 });
    }
    const normalizedEmail = emailValidation.normalized;

    // 2. Strict Terms & Privacy Acceptance (checked before any DB/order creation or payment calls)
    if (termsAccepted !== true) {
      return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED', field: 'terms' }, { status: 422 });
    }

    if (!coin || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many cart items (max 50)' }, { status: 400 });
    }

    const termsAcceptedAt = new Date().toISOString();

    // Merge identical cart lines
    const merged = new Map<string, { tariffId: string; days: number | null; quantity: number; topUpIccid: string | null }>();
    for (const it of items) {
      if (!it.tariffId) continue;
      if (typeof it.quantity !== 'number' || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99) {
        return NextResponse.json({ error: 'Ungültige Anzahl (1–99 erlaubt)' }, { status: 400 });
      }
      if (it.days !== undefined && it.days !== null) {
        if (typeof it.days !== 'number' || !Number.isInteger(it.days) || it.days < 1 || it.days > 365) {
          return NextResponse.json({ error: 'Ungültige Laufzeit (1-365 Tage erlaubt)' }, { status: 400 });
        }
      }
      const days   = it.days ? clampDays(it.days) : null;
      const iccid  = it.topUpIccid?.trim() || null;
      const key    = `${it.tariffId}:${days ?? 0}:${iccid ?? ''}`;
      const q      = it.quantity;
      const prev   = merged.get(key);
      if (prev) {
        prev.quantity = Math.min(99, prev.quantity + q);
      } else {
        merged.set(key, { tariffId: it.tariffId, days, quantity: q, topUpIccid: iccid });
      }
    }
    const lines = Array.from(merged.values());
    if (lines.length === 0) return NextResponse.json({ error: 'No valid items' }, { status: 400 });

    const service = createServiceClient();

    // Early user & customer resolution for top-up ICCID validation and ownership checks
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    // Enforce account locks (Hard Lock, Soft Lock, Cash Freeze) for both logged-in users and guest emails
    const earlyLocale = String(body.customerLocale || body.locale || request.headers.get('x-locale') || 'de').slice(0, 2);
    const emailState = await getEffectiveAccountStatus({ userId: user?.id, email: normalizedEmail });
    const sessionState =
      user?.email && user.email.toLowerCase() !== normalizedEmail
        ? await getEffectiveAccountStatus({ userId: user.id, email: user.email })
        : null;

    const restrictedState =
      emailState.isHardLocked || emailState.isSoftLocked
        ? emailState
        : sessionState && (sessionState.isHardLocked || sessionState.isSoftLocked)
          ? sessionState
          : null;

    if (restrictedState) {
      return NextResponse.json(
        { error: getAccountLockMessage(restrictedState, earlyLocale), code: 'ACCOUNT_RESTRICTED' },
        { status: 403 }
      );
    }

    if (coin === 'ESIM_CASH') {
      const cashFrozenState = emailState.cashFrozen
        ? emailState
        : sessionState?.cashFrozen
          ? sessionState
          : null;
      if (cashFrozenState) {
        return NextResponse.json(
          { error: getAccountLockMessage(cashFrozenState, earlyLocale), code: 'CASH_FROZEN' },
          { status: 403 }
        );
      }
    }

    const userId = await resolveCustomer(service, user, normalizedEmail);

    // Validate and auto-resolve any masked or formatted topUpIccid
    for (const line of lines) {
      if (line.topUpIccid) {
        let cleanIccid = line.topUpIccid.replace(/\s+/g, '');
        if (cleanIccid.includes('•') || cleanIccid.includes('*') || !/^89\d{16,20}$/.test(cleanIccid)) {
          const last4 = cleanIccid.replace(/\D/g, '').slice(-4);
          if (last4.length === 4) {
            let oQuery = service
              .from('orders')
              .select('iccid')
              .eq('status', 'completed')
              .ilike('iccid', `%${last4}`)
              .order('created_at', { ascending: false })
              .limit(1);
            if (userId) {
              oQuery = oQuery.eq('user_id', userId);
            } else if (normalizedEmail) {
              oQuery = oQuery.eq('customer_email', normalizedEmail);
            }
            const { data: matchedOrder } = await oQuery.maybeSingle();
            if (matchedOrder?.iccid && /^89\d{16,20}$/.test(matchedOrder.iccid.trim())) {
              cleanIccid = matchedOrder.iccid.trim();
              line.topUpIccid = cleanIccid;
            }
          }
        }

        if (!/^89\d{16,20}$/.test(cleanIccid)) {
          return NextResponse.json({
            error: 'Ungültige ICCID für die Aufladung. Bitte eine gültige eSIM-Nummer angeben.',
            code: 'topup_error_invalid_iccid',
          }, { status: 400 });
        }
        line.topUpIccid = cleanIccid;
      }
    }

    const ids = Array.from(new Set(lines.map((l) => l.tariffId)));
    const uuidIds = ids.filter(isUuid);
    const codeIds = ids.filter((id) => !isUuid(id));

    const tariffs: any[] = [];
    if (uuidIds.length > 0) {
      const { data: byId } = await service
        .from('tariffs')
        .select('id, name, package_code, sale_price_eur, usd_eur_rate, validity_days, tariff_type, is_active, data_gb, discount_rule_code, support_top_up_type, active_type')
        .in('id', uuidIds);
      if (byId) tariffs.push(...byId);
    }
    if (codeIds.length > 0) {
      const allCodes = Array.from(new Set([
        ...codeIds,
        ...codeIds.map((c) => c.replace(/^TOPUP_/, '')),
        ...codeIds.map((c) => 'TOPUP_' + c.replace(/^TOPUP_/, '')),
      ]));
      const { data: byCode } = await service
        .from('tariffs')
        .select('id, name, package_code, sale_price_eur, usd_eur_rate, validity_days, tariff_type, is_active, data_gb, discount_rule_code, support_top_up_type, active_type')
        .in('package_code', allCodes);
      if (byCode) tariffs.push(...byCode);
    }

    const tMap = new Map<string, any>();
    for (const t of tariffs) {
      tMap.set(t.id, t);
      if (t.package_code) {
        tMap.set(t.package_code, t);
        tMap.set(t.package_code.replace(/^TOPUP_/, ''), t);
        tMap.set(`TOPUP_${t.package_code.replace(/^TOPUP_/, '')}`, t);
      }
    }

    // Fallback: If any top-up line is not found yet in tariffs, query eSIMAccess and auto-create
    for (const line of lines) {
      const existing = tMap.get(line.tariffId) || tMap.get(line.tariffId.replace(/^TOPUP_/, '')) || tMap.get('TOPUP_' + line.tariffId.replace(/^TOPUP_/, ''));
      if (line.topUpIccid && !existing) {
        try {
          const res = await fetchTopUpPackages(line.topUpIccid);
          const pkgs = res.obj?.packageList ?? [];
          const found = pkgs.find(
            (p) =>
              p.packageCode === line.tariffId ||
              p.packageCode.replace(/^TOPUP_/, '') === line.tariffId.replace(/^TOPUP_/, '')
          );
          if (found) {
            const ekUsd = priceToUsd(found.price);
            const salePriceEur = calculateSalePrice(ekUsd, 0.92);
            const tariffSlug = slugify(found.name) || slugify(found.packageCode) || 'topup-tariff';
            const { data: created, error: insErr } = await service
              .from('tariffs')
              .upsert({
                package_code: found.packageCode,
                slug: tariffSlug,
                name: found.name,
                country_code: found.locationCode || 'XX',
                country_name: found.locationCode || 'Global',
                flag_emoji: '🌐',
                data_gb: bytesToGb(getVolumeBytes(found as any)),
                validity_days: found.duration || 1,
                ek_price_usd: ekUsd,
                sale_price_eur: salePriceEur,
                usd_eur_rate: 0.92,
                is_active: false, // Internal reference for top-up orders only; do NOT show as standalone shop tariff
                is_top_up_eligible: true,
                tariff_type: 'travel_standard',
                raw_data: found as any,
              } as any, { onConflict: 'package_code' })
              .select('id, name, package_code, sale_price_eur, usd_eur_rate, validity_days, tariff_type, is_active, data_gb')
              .single();

            if (insErr) {
              console.warn('[checkout] Fallback top-up upsert error:', insErr.message);
            }
            let targetTariff = created;
            if (!targetTariff) {
              const { data: byCode } = await service
                .from('tariffs')
                .select('id, name, package_code, sale_price_eur, usd_eur_rate, validity_days, tariff_type, is_active, data_gb, discount_rule_code, support_top_up_type, active_type')
                .eq('package_code', found.packageCode)
                .maybeSingle();
              targetTariff = byCode;
            }
            if (targetTariff) {
              tariffs.push(targetTariff);
              tMap.set(targetTariff.id, targetTariff);
              tMap.set(targetTariff.package_code, targetTariff);
              tMap.set(targetTariff.package_code.replace(/^TOPUP_/, ''), targetTariff);
              tMap.set(`TOPUP_${targetTariff.package_code.replace(/^TOPUP_/, '')}`, targetTariff);
              line.tariffId = targetTariff.id;
            }
          }
        } catch (err) {
          console.warn('[checkout] Fallback top-up package creation notice:', err);
        }
      }
    }

    // 1. Calculate total base amount and promotional discounts via Central Pricing Service
    const pricingItems = [];
    const validLines: typeof lines = [];

    for (const line of lines) {
      const t = tMap.get(line.tariffId) || tMap.get(line.tariffId.replace(/^TOPUP_/, '')) || tMap.get('TOPUP_' + line.tariffId.replace(/^TOPUP_/, ''));
      if (!t) continue;
      const isTopUp = !!line.topUpIccid;
      if (!isTopUp && !t.is_active) continue;
      const isUnlimited = (t.tariff_type?.startsWith('unlimited') ?? false) || t.data_gb === 0;

      pricingItems.push({
        packageCode: t.package_code,
        salePriceEur: t.sale_price_eur,
        quantity: line.quantity,
        validityDays: line.days ?? undefined,
        isUnlimited,
        discountRuleCode: t.discount_rule_code,
        isTopUp,
        isCash: coin === 'ESIM_CASH',
      });
      validLines.push(line);
    }

    if (validLines.length !== lines.length) {
      return NextResponse.json(
        { error: 'Ein ausgewählter Tarif ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.' },
        { status: 400 }
      );
    }

    const calculatedOrder = await calculateOrderPricing(pricingItems);
    const totalBaseEur = calculatedOrder.totalCents / 100;

    // Rule B4(a): Check promotion cutoff (< 30 minutes) on all promotions that applied discounts
    if (calculatedOrder.discountCents > 0) {
      const now = getNow();
      const appliedPromos = Array.from(new Set([calculatedOrder.promotion, calculatedOrder.topupPromotion].filter(
        (p): p is Promotion => Boolean(p && p.discount_basis_points > 0)
      )));

      for (const promo of appliedPromos) {
        const promoEndMs = new Date(promo.ends_at).getTime();
        const msRemaining = promoEndMs - now.getTime();
        if (msRemaining < 30 * 60 * 1000) {
          return NextResponse.json({
            error: `Die Aktion „${promo.internal_name}“ endet in Kürze (< 30 Minuten). Bitte warten Sie auf die Normalpreise oder aktualisieren Sie Ihren Warenkorb.`,
            code: 'PROMO_ENDING_SOON'
          }, { status: 400 });
        }
      }
    }

    let cookieLocale: string | undefined;
    try {
      const cookieStore = await cookies();
      cookieLocale = cookieStore.get('locale')?.value;
    } catch (_) {}
    const rawLocale = body.customerLocale || body.locale || request.headers.get('x-locale') || cookieLocale || request.headers.get('accept-language')?.slice(0, 2) || 'de';
    const customerLocale = isValidLocale(rawLocale) ? rawLocale : 'de';
    const dict = getServerDict(customerLocale);

    if (
      !Number.isInteger(calculatedOrder.totalCents) ||
      calculatedOrder.totalCents <= 0 ||
      calculatedOrder.items.some((ci) => !Number.isInteger(ci.unitPromoCents) || ci.unitPromoCents <= 0)
    ) {
      return NextResponse.json({ error: 'Ungültiger Bestellbetrag' }, { status: 400 });
    }

    if (expectedTotalCents !== undefined && expectedTotalCents !== null) {
      if (!Number.isInteger(expectedTotalCents) || expectedTotalCents !== calculatedOrder.totalCents) {
        return NextResponse.json(
          {
            error:
              customerLocale === 'de'
                ? `Der Preis hat sich geändert (${formatCurrencyEuro(totalBaseEur, customerLocale)}). Bitte prüfe den neuen Gesamtbetrag und bestätige erneut.`
                : `The price has changed (${formatCurrencyEuro(totalBaseEur, customerLocale)}). Please review the updated total and try again.`,
            code: 'PRICE_CHANGED',
            actualTotalEur: totalBaseEur,
            actualTotalCents: calculatedOrder.totalCents,
          },
          { status: 409 }
        );
      }
    }

    // Gatekeeper check: validate top-up eligibility, 9/9 limit, and concurrency lock per ICCID
    for (const line of lines) {
      if (line.topUpIccid) {
        const esim = await getEsimRecord(line.topUpIccid);
        const t = tMap.get(line.tariffId) || tMap.get(line.tariffId.replace(/^TOPUP_/, '')) || tMap.get('TOPUP_' + line.tariffId.replace(/^TOPUP_/, ''));
        const eligibility = getTopUpEligibility(esim, t);

        if (!eligibility.allowed) {
          const errKey = eligibility.reason === 'limit_reached' ? 'topup_error_limit_reached' : 'topup_error_not_supported';
          const errMsg = (dict as any)[errKey] || (eligibility.reason === 'limit_reached'
            ? 'Maximales Auflade-Limit (9/9) erreicht. Diese eSIM kann nicht weiter aufgeladen werden.'
            : 'Dieser Tarif kann nicht aufgeladen werden.');
          return NextResponse.json({ error: errMsg, code: errKey }, { status: 400 });
        }

        // Concurrency lock: maximum 1 open unpaid top-up session per ICCID
        const hasPending = await hasPendingTopUpSession(line.topUpIccid);
        if (hasPending) {
          const errMsg = (dict as any).topup_error_pending_session ||
            (customerLocale === 'de'
              ? 'Für diese eSIM existiert bereits eine offene Zahlungs-Session. Bitte schließe diese zuerst ab oder warte, bis sie abläuft.'
              : 'There is already an open payment session for this eSIM. Please complete or cancel it first.');
          return NextResponse.json({ error: errMsg, code: 'topup_error_pending_session' }, { status: 400 });
        }

        // Enforce periodNum for validity-only plans (supportTopUpType = 3)
        if (t?.support_top_up_type === 3 && (!line.days || line.days <= 0)) {
          return NextResponse.json({
            error: 'Für reine Laufzeitverlängerungen muss eine Gültigkeitsdauer (Tage) angegeben werden.',
            code: 'topup_error_missing_period',
          }, { status: 400 });
        }
      }
    }

    // 2. Process checkouts based on payment method
    if (coin !== 'ESIM_CASH') {
      const coinCfg = await getCoin(coin);
      if (!coinCfg) {
        const errMsg = (dict.pay_coin_unavailable || 'Coin {coin} ist nicht verfügbar').replace('{coin}', coin);
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
      const minOrderEur = Number(coinCfg.min_order_eur || 0);
      if (minOrderEur > 0 && totalBaseEur < minOrderEur) {
        const dict = getServerDict(customerLocale);
        const formattedMin = formatCurrencyEuro(minOrderEur, customerLocale);
        const formattedCart = formatCurrencyEuro(totalBaseEur, customerLocale);
        const coinName = coinCfg.name || coinCfg.code;
        const template = dict.pay_min_order_error || 'Mindestbestellwert für {coin} ist {min} (Ihr Warenkorb: {cart})';
        const errorMsg = template
          .replace('{coin}', coinName)
          .replace('{min}', formattedMin)
          .replace('{cart}', formattedCart);
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
    }

    const ref = crypto.randomUUID();

    if (coin === 'ESIM_CASH') {
      let sessionToken: string | undefined;
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get('session_token')?.value;
      } catch {}

      const authRes = await authenticateVerifiedCashUser(sessionToken);
      if (!authRes.ok) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      const authedUser = authRes.user;

      if (normalizedEmail !== authedUser.email) {
        return NextResponse.json(
          {
            error:
              customerLocale === 'de'
                ? 'Bei Zahlung mit eSIM Cash muss die E-Mail-Adresse mit deinem eingeloggten Konto übereinstimmen.'
                : 'When paying with eSIM Cash, the email address must match your signed-in account.',
          },
          { status: 403 }
        );
      }

      const cashOrderLines: CashOrderLineInput[] = [];
      for (let i = 0; i < validLines.length; i++) {
        const line = validLines[i];
        const calcItem = calculatedOrder.items[i];
        const t =
          tMap.get(line.tariffId) ||
          tMap.get(line.tariffId.replace(/^TOPUP_/, '')) ||
          tMap.get('TOPUP_' + line.tariffId.replace(/^TOPUP_/, ''));
        if (!t) continue;
        const isTopUp = !!line.topUpIccid;
        const isUnlimited = (t.tariff_type?.startsWith('unlimited') ?? false) || t.data_gb === 0;
        const periodNum = isUnlimited && line.days ? line.days : null;

        for (let n = 0; n < line.quantity; n++) {
          cashOrderLines.push({
            tariffId: t.id,
            orderType: isTopUp ? 'top_up' : 'new_esim',
            unitCents: calcItem.unitPromoCents,
            usdEurRate: Number(t.usd_eur_rate || 0.92),
            periodNum,
            topUpIccid: line.topUpIccid,
            referredBy: referredBy || null,
            locale: customerLocale,
            termsAcceptedAt,
            termsVersion: TERMS_VERSION,
          });
        }
      }

      if (cashOrderLines.length === 0) {
        return NextResponse.json({ error: 'No valid tariffs' }, { status: 400 });
      }

      const txRes = await executeEsimCashCheckout({
        userId: authedUser.id,
        userEmail: authedUser.email,
        fullName: authedUser.fullName,
        checkoutRef: ref,
        totalCents: calculatedOrder.totalCents,
        orderItems: cashOrderLines,
        description: `Kauf via eSIM Cash (#${ref.slice(0, 8).toUpperCase()})`,
      });

      if (!txRes.ok) {
        if (txRes.code === 'INSUFFICIENT_BALANCE') {
          const msg = (dict.pay_insufficient || 'Insufficient eSIM Cash balance')
            .replace('{total}', formatCurrencyEuro(txRes.requiredEur ?? totalBaseEur, customerLocale))
            .replace('{balance}', formatCurrencyEuro(txRes.balanceEur ?? 0, customerLocale));
          return NextResponse.json({ error: msg, code: txRes.code }, { status: 400 });
        }
        return NextResponse.json({ error: txRes.error, code: txRes.code }, { status: txRes.status });
      }

      // Fulfill orders immediately and auto-refund any failed/review items atomically
      const fulfillResults = await fulfillOrders(service, txRes.orderIds);
      for (const r of fulfillResults) {
        if (!r.ok) {
          await refundFailedEsimCashOrder(r.orderId);
        }
      }

      if (fulfillResults.length > 0 && fulfillResults.every((r) => !r.ok)) {
        return NextResponse.json(
          {
            error:
              customerLocale === 'de'
                ? 'Die Bereitstellung beim Mobilfunkanbieter ist fehlgeschlagen. Dein gesamtes eSIM Cash Guthaben wurde automatisch vollständig erstattet.'
                : 'eSIM provisioning failed at the network provider. Your full eSIM Cash balance has been automatically refunded.',
            code: 'PROVISIONING_FAILED_REFUNDED',
          },
          { status: 502 }
        );
      }

      // Save newsletter consent if checked (strictly bound to authenticated user ID)
      if (body.newsletterConsent) {
        try {
          await service
            .from('users')
            .update({ newsletter_consent: true } as any)
            .eq('id', authedUser.id);
        } catch (dbErr) {
          console.error('[checkout] newsletter update failed:', dbErr);
        }
      }

      const cashRes = NextResponse.json({ ref, remainingBalanceEur: txRes.remainingBalanceEur });
      cashRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return cashRes;
    } else {
      // Standard Crypto Checkout
      const orderRows: Array<Record<string, unknown>> = [];
      for (let i = 0; i < validLines.length; i++) {
        const line = validLines[i];
        const calcItem = calculatedOrder.items[i];
        const t = tMap.get(line.tariffId) || tMap.get(line.tariffId.replace(/^TOPUP_/, '')) || tMap.get('TOPUP_' + line.tariffId.replace(/^TOPUP_/, ''));
        if (!t) continue;
        const isTopUp = !!line.topUpIccid;
        const isUnlimited = (t.tariff_type?.startsWith('unlimited') ?? false) || t.data_gb === 0;
        const unit = calcItem.unitPromoCents / 100;
        const periodNum = (isUnlimited && line.days) ? line.days : null;

        for (let n = 0; n < line.quantity; n++) {
          orderRows.push({
            user_id: userId, tariff_id: t.id,
            order_type: isTopUp ? 'top_up' : 'new_esim', status: 'pending',
            customer_email: normalizedEmail, customer_name: user?.user_metadata?.full_name ?? null,
            amount_eur: unit, usd_eur_rate: t.usd_eur_rate, period_num: periodNum,
            top_up_iccid: line.topUpIccid, checkout_ref: ref,
            referred_by_code: referredBy,
            cashback_applied_eur: 0.00, // no balance discount
            locale: customerLocale,
            terms_accepted_at: termsAcceptedAt,
            terms_version: TERMS_VERSION,
          });
        }
      }

      if (orderRows.length === 0) return NextResponse.json({ error: 'No valid tariffs' }, { status: 400 });

      const { data: inserted, error: oErr } = await service
        .from('orders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(orderRows as any).select('id');
      if (oErr || !inserted) {
        console.error('[crypto/checkout] order insert', oErr?.message);
        return NextResponse.json({ error: 'Could not create orders' }, { status: 500 });
      }
      const orderIds = inserted.map((o) => o.id);

      const session = await createCryptoSession({
        orderIds,
        email: normalizedEmail,
        baseEur: totalBaseEur,
        coinCode: coin,
        locale: customerLocale,
        orderRef: ref,
        expiresAtLimit: calculatedOrder.promotion && calculatedOrder.discountCents > 0
          ? calculatedOrder.promotion.ends_at
          : undefined,
      });

      // Save newsletter consent & locale asynchronously (non-blocking)
      const updateObj: Record<string, unknown> = { locale: customerLocale };
      if (body.newsletterConsent) updateObj.newsletter_consent = true;
      service
        .from('users')
        .update(updateObj as any)
        .eq('email', normalizedEmail)
        .then(() => {})
        .catch((dbErr: any) => {
          console.error('[checkout] user update failed:', dbErr);
        });

      // Send checkout email notification asynchronously (non-blocking)
      const checkoutLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net'}/checkout/crypto/${session.id}`;
      const invoiceId = `INV-${session.id.split('-')[0].toUpperCase()}`;
      sendCheckoutNotificationEmail({
        to: normalizedEmail,
        invoiceId,
        coin: session.coin.toUpperCase(),
        cryptoAmount: session.cryptoAmount,
        amountEur: session.amountEur,
        expiresAt: session.expiresAt,
        checkoutLink,
        locale: customerLocale,
        durationMins: session.checkoutDurationMins || 30,
      }).catch((mailErr: any) => {
        console.error('[checkout] failed to send checkout email:', mailErr);
      });

      const response = NextResponse.json({ sessionId: session.id, ref });
      try {
        const tariffNames = orderRows.map((r: any) => {
          const t = tMap.get(r.tariff_id);
          if (!t) return '';
          return formatFullCheckoutTariffName({
            countryName: t.country_name,
            countryCode: t.country_code,
            locationCodes: t.location_codes,
            region: t.region,
            tariffType: t.tariff_type,
            dataGb: Number(t.data_gb),
            validityDays: r.period_num ?? t.validity_days,
            name: t.name,
          }, customerLocale);
        }).filter(Boolean);
        const uniqueTariffs = Array.from(new Set(tariffNames)).join(', ');
        const finalEur = session.amountEur || totalBaseEur;
        const amountStr = `${finalEur.toFixed(2)} €`;

        if (uniqueTariffs) {
          response.cookies.set('esim_checkout_tariff', encodeURIComponent(uniqueTariffs), {
            path: '/',
            maxAge: 86400,
            sameSite: 'lax',
          });
        }
        if (amountStr) {
          response.cookies.set('esim_checkout_amount', encodeURIComponent(amountStr), {
            path: '/',
            maxAge: 86400,
            sameSite: 'lax',
          });
        }
      } catch (cookieErr) {
        console.error('[checkout] error setting response cookies:', cookieErr);
      }

      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[crypto/checkout] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
