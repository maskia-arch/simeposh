'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Price } from '@/components/Price';

export interface EsimCashAccount {
  id: string;
  email: string;
  user_id: string | null;
  balance_eur: number | string;
  total_spend_eur: number | string;
  affiliate_code: string;
  referred_by_code: string | null;
  extra_cashback_queue: number;
  created_at: string;
}

export interface EsimCashTransaction {
  id: string;
  email: string;
  user_id: string | null;
  amount: number | string;
  type: string; // earn | spend | referral_bonus
  description: string | null;
  created_at: string;
}

interface EsimCashDashboardProps {
  account: EsimCashAccount;
  transactions: EsimCashTransaction[];
}

function getRankInfo(totalSpend: number) {
  if (totalSpend >= 1000) {
    return { rank: 'Platinum', rate: 10, nextThreshold: null, prevThreshold: 1000, colorClass: 'from-indigo-500 via-purple-500 to-pink-500 text-white shadow-indigo-200' };
  } else if (totalSpend >= 500) {
    return { rank: 'Gold', rate: 8, nextThreshold: 1000, prevThreshold: 500, colorClass: 'from-amber-400 to-yellow-500 text-amber-950 shadow-yellow-100' };
  } else if (totalSpend >= 100) {
    return { rank: 'Silver', rate: 6, nextThreshold: 500, prevThreshold: 100, colorClass: 'from-slate-300 to-slate-500 text-slate-900 shadow-slate-100' };
  } else {
    return { rank: 'Bronze', rate: 5, nextThreshold: 100, prevThreshold: 0, colorClass: 'from-amber-600 to-amber-800 text-white shadow-amber-100' };
  }
}

export default function EsimCashDashboard({ account, transactions }: EsimCashDashboardProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  // Affiliate personalization states
  const [currentAffiliateCode, setCurrentAffiliateCode] = useState(account.affiliate_code);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(account.affiliate_code);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}?ref=${currentAffiliateCode}`);
    }
  }, [currentAffiliateCode]);

  const totalSpend = Number(account.total_spend_eur || 0);
  const balance = Number(account.balance_eur || 0);
  const rankInfo = getRankInfo(totalSpend);

  // Calculate progress percent to next tier
  let progressPercent = 100;
  let remainingSpend = 0;
  if (rankInfo.nextThreshold !== null) {
    const range = rankInfo.nextThreshold - rankInfo.prevThreshold;
    const progress = totalSpend - rankInfo.prevThreshold;
    progressPercent = Math.min(100, Math.max(0, (progress / range) * 100));
    remainingSpend = Math.max(0, rankInfo.nextThreshold - totalSpend);
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSaveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess(false);

    const code = editValue.trim();
    if (!code) {
      setUpdateError(t('cash_code_empty' as any) || 'Code cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/cashback/update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update code');

      setCurrentAffiliateCode(data.code);
      setUpdateSuccess(true);
      setIsEditing(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err: any) {
      setUpdateError(err.message || 'Error updating code');
    } finally {
      setSaving(false);
    }
  };

  const getRankBadgeLabel = (rank: string) => {
    switch (rank) {
      case 'Platinum': return t('cash_rank_platinum' as any) || 'Platin';
      case 'Gold': return t('cash_rank_gold' as any) || 'Gold';
      case 'Silver': return t('cash_rank_silver' as any) || 'Silber';
      default: return t('cash_rank_bronze' as any) || 'Bronze';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance & Ticket Card */}
        <div className="rounded-2xl border border-slate-200/60 bg-white/65 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
          
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {t('cash_balance' as any) || 'Verfügbares Guthaben'}
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {balance.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-slate-500">€</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t('cash_balance_desc' as any) || 'Kann beim Checkout als 100% Bezahlmethode ausgewählt werden.'}
            </p>
          </div>

          {account.extra_cashback_queue > 0 ? (
            <div className="mt-6 p-4 rounded-xl bg-brand-50/80 border border-brand-100 flex items-center gap-3">
              <span className="text-2xl">🎟️</span>
              <div>
                <p className="text-xs font-semibold text-brand-900">
                  {(t('cash_extra_cashback' as any) || 'Extra-Cashback Ticket aktiv!')}
                </p>
                <p className="text-[11px] text-brand-700 mt-0.5">
                  {(t('cash_extra_cashback_desc' as any) || 'Du erhältst +5% zusätzliche Gutschrift beim nächsten Kauf.').replace('{count}', String(account.extra_cashback_queue))}
                </p>
              </div>
              <span className="ml-auto bg-brand-600 text-white font-bold text-xs rounded-full h-6 w-6 flex items-center justify-center shrink-0">
                {account.extra_cashback_queue}
              </span>
            </div>
          ) : (
            <div className="mt-6 p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-xs font-medium text-slate-700">
                  {t('cash_tip_title' as any) || 'Mehr sparen?'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('cash_tip_desc' as any) || 'Empfiehl uns weiter und sammle Extra-Cashback Tickets.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Rank & Progress Card */}
        <div className="rounded-2xl border border-slate-200/60 bg-white/65 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('cash_rank' as any) || 'Aktueller Status'}
              </h3>
              <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${rankInfo.colorClass} px-3 py-1 text-xs font-extrabold shadow-sm tracking-wide`}>
                {getRankBadgeLabel(rankInfo.rank)} ({rankInfo.rate}%)
              </span>
            </div>

            {/* Ranks list progress bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                <span>{totalSpend.toFixed(2)} € {t('dash_spent')}</span>
                {rankInfo.nextThreshold !== null ? (
                  <span>{rankInfo.nextThreshold} €</span>
                ) : (
                  <span>{t('cash_max_tier' as any) || 'Maximum'}</span>
                )}
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 border-t border-slate-100 pt-4">
            {rankInfo.nextThreshold !== null ? (
              <p className="flex items-center gap-1.5 font-medium text-slate-700">
                <span>🚀</span>
                <span>
                  {(t('cash_next_tier_desc' as any) || 'Noch {amount} € Umsatz bis zum {rank}-Rang').replace('{amount}', remainingSpend.toFixed(2)).replace('{rank}', getRankBadgeLabel(getRankInfo(rankInfo.nextThreshold).rank))}
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 font-semibold text-green-600">
                <span>👑</span>
                <span>{t('cash_highest_tier' as any) || 'Glückwunsch! Du hast den höchsten Cashback-Rang erreicht.'}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tiers Overview */}
      <div className="rounded-2xl border border-slate-200/60 bg-white/65 backdrop-blur-md p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-5">
          {t('cash_tiers_overview' as any) || 'Umsatz-Ränge & Cashback-Sätze'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Bronze', spendNum: 0, rate: '5%', color: 'border-amber-200 bg-amber-50/20 text-amber-800' },
            { name: 'Silver', spendNum: 100, rate: '6%', color: 'border-slate-200 bg-slate-50/20 text-slate-700' },
            { name: 'Gold', spendNum: 500, rate: '8%', color: 'border-yellow-200 bg-yellow-50/20 text-yellow-800' },
            { name: 'Platinum', spendNum: 1000, rate: '10%', color: 'border-indigo-200 bg-indigo-50/20 text-indigo-800' }
          ].map((tier) => {
            const isCurrent = rankInfo.rank.toLowerCase() === tier.name.toLowerCase();
            return (
              <div 
                key={tier.name}
                className={`relative rounded-xl border p-4 text-center transition-all ${tier.color} ${
                  isCurrent ? 'ring-2 ring-brand-500 scale-[1.02] shadow-sm' : 'opacity-80'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {t('cash_current_tier' as any) || 'Aktiv'}
                  </span>
                )}
                <p className="font-extrabold text-sm">{getRankBadgeLabel(tier.name)}</p>
                <p className="text-[10px] opacity-75 mt-1">
                  {t('dest_from_price_prefix' as any) || 'ab'}{' '}
                  <Price eur={tier.spendNum} className="inline font-semibold text-slate-700" />
                </p>
                <p className="text-2xl font-black mt-2">{tier.rate}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Affiliate / Referral Section */}
      <div className="rounded-2xl border border-slate-200/60 bg-white/65 backdrop-blur-md p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="max-w-2xl">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🤝</span>
            <span>{t('cash_affiliate_title' as any) || 'Freunde werben (Win-Win)'}</span>
          </h3>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">
            {t('cash_affiliate_desc' as any) || 'Schenke deinen Freunden 5% Extra-Cashback auf ihren ersten Einkauf. Sobald sie diesen abschließen, erhältst du ebenfalls ein Ticket für +5% Extra-Cashback auf deinen nächsten Einkauf! Die Tickets reihen sich in deine Warteschlange ein und werden nacheinander eingelöst.'}
          </p>

          {/* Copy input / Edit input */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('cash_affiliate_link' as any) || 'Dein persönlicher Empfehlungslink'}
              </label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(currentAffiliateCode);
                    setIsEditing(true);
                    setUpdateError('');
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1"
                >
                  ✏️ {t('cash_personalize_link' as any) || 'Personalize link'}
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveCode} className="space-y-3 max-w-lg">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {typeof window !== 'undefined' ? window.location.host : ''}/?ref=
                  </span>
                  <input
                    type="text"
                    required
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="MEINCODE"
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? '...' : (t('cash_save' as any) || 'Save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    {t('cash_cancel' as any) || 'Cancel'}
                  </button>
                </div>
                {updateError && (
                  <p className="text-xs font-semibold text-red-500 mt-1">{updateError}</p>
                )}
              </form>
            ) : (
              <div className="flex gap-2 max-w-lg">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-xs text-slate-600 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all shrink-0 shadow-sm flex items-center gap-1.5 ${
                    copied 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{t('cash_copied' as any) || 'Kopiert!'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>{t('cash_copy' as any) || 'Kopieren'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {updateSuccess && (
              <p className="text-xs font-semibold text-green-600 mt-1">
                ✓ {t('cash_link_updated' as any) || 'Referral link updated successfully!'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-slate-200/60 bg-white/65 backdrop-blur-md p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-5">
          {t('cash_transactions' as any) || 'Transaktionsverlauf'}
        </h3>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
            <span className="text-3xl block mb-2">💸</span>
            <p className="text-xs font-medium">{t('cash_tx_empty' as any) || 'Noch keine Transaktionen vorhanden.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
            {transactions.map((tx) => {
              const amount = Number(tx.amount || 0);
              const isEarn = tx.type === 'earn';
              const isSpend = tx.type === 'spend';
              const isRef = tx.type === 'referral_bonus';

              return (
                <div key={tx.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.description || (
                        isRef 
                          ? (t('cash_tx_referral' as any) || 'Referral Bonus') 
                          : isEarn 
                            ? (t('cash_tx_earn' as any) || 'Cashback') 
                            : (t('cash_tx_spend' as any) || 'Redemption')
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="shrink-0 text-right">
                    {isRef ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                        🎟️ +5%
                      </span>
                    ) : (
                      <span className={`text-sm font-extrabold ${isEarn ? 'text-green-600' : 'text-red-500'}`}>
                        {isEarn ? '+' : ''}{amount.toFixed(2)} €
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
