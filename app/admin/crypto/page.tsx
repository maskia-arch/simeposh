import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { CryptoCoinsAdmin } from '@/components/CryptoCoinsAdmin';

export const metadata: Metadata = { title: 'Krypto-Zahlungen' };
export const dynamic = 'force-dynamic';

export default async function AdminCryptoPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Krypto-Zahlungen</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gebühren, Bestätigungen und Verfügbarkeit pro Coin. Ein Coin wird nur angeboten,
          wenn er aktiv ist <strong>und</strong> die Wallet-Adresse als Umgebungsvariable
          (<code>WALLET_BTC</code>, <code>WALLET_LTC</code> …) hinterlegt ist.
        </p>
      </div>
      <CryptoCoinsAdmin />
    </div>
  );
}
