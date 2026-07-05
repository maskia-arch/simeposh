'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserAuthData {
  email?: string;
  email_confirmed_at?: string | null;
}

interface UserProfileData {
  full_name: string | null;
  phone: string | null;
  billing_address: string | null;
  two_factor_enabled: boolean;
  is_verified: boolean;
}

interface AccountSettingsProps {
  user: UserAuthData;
  profile: UserProfileData;
}

export function AccountSettings({ user, profile }: AccountSettingsProps) {
  const router = useRouter();

  // Profile fields state
  const [name, setName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [billingAddress, setBillingAddress] = useState(profile.billing_address ?? '');
  const [email, setEmail] = useState(user.email ?? '');

  // Loading & feedback states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // 2FA state
  const [twoFactor, setTwoFactor] = useState(profile.two_factor_enabled);
  const [show2faConfirm, setShow2faConfirm] = useState(false);
  const [pwd2fa, setPwd2fa] = useState('');
  const [loading2fa, setLoading2fa] = useState(false);
  const [error2fa, setError2fa] = useState<string | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 1. Resend verification email
  const handleResendVerification = async () => {
    setVerificationLoading(true);
    setVerificationSent(false);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden');
      setVerificationSent(true);
    } catch (err: any) {
      alert(err.message || 'Verifizierungs-Mail konnte nicht gesendet werden.');
    } finally {
      setVerificationLoading(false);
    }
  };

  // 2. Update Profile Stammdaten
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, billing_address: billingAddress, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');
      
      if (data.emailChangePending) {
        setProfileMessage({
          type: 'success',
          text: 'Profil aktualisiert! Bitte bestätige die E-Mail-Änderung über den Link, der an deine neue Adresse gesendet wurde.',
        });
      } else {
        setProfileMessage({ type: 'success', text: 'Profil erfolgreich gespeichert!' });
      }
      router.refresh();
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Speichern fehlgeschlagen' });
    } finally {
      setProfileLoading(false);
    }
  };

  // 3. Confirm 2FA Toggle Action
  const handleToggle2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading2fa(true);
    setError2fa(null);
    try {
      const targetState = !twoFactor;
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetState, password: pwd2fa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bestätigung fehlgeschlagen');
      
      setTwoFactor(targetState);
      setShow2faConfirm(false);
      setPwd2fa('');
      router.refresh();
    } catch (err: any) {
      setError2fa(err.message || 'Passwort-Bestätigung fehlgeschlagen');
    } finally {
      setLoading2fa(false);
    }
  };

  // 4. Delete Account Action
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, confirmationText: deleteConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen');

      // Account successfully anonymized & deleted
      setShowDeleteModal(false);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Löschvorgang fehlgeschlagen');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isVerified = !!profile.is_verified;

  return (
    <div className="space-y-8">
      {/* ⚠️ Email verification warning banner */}
      {!isVerified && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" role="img" aria-label="warning">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Deine E-Mail-Adresse ist noch nicht bestätigt.</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Bitte verifiziere dein Konto, um alle Funktionen uneingeschränkt nutzen zu können.
              </p>
            </div>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={verificationLoading || verificationSent}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
              verificationSent
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {verificationLoading
              ? 'Wird gesendet...'
              : verificationSent
              ? '✓ Gesendet!'
              : 'Bestätigungs-Mail senden'}
          </button>
        </div>
      )}

      {/* 1. Profile section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Profil & Stammdaten</h2>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vollständiger Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Max Mustermann"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Telefonnummer</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="z. B. +49 170 1234567"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">E-Mail-Adresse</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rechnungsadresse</label>
            <textarea
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Musterstraße 1&#10;12345 Berlin&#10;Deutschland"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
            />
          </div>

          {profileMessage && (
            <div className={`p-4 rounded-xl text-xs font-medium ${
              profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {profileMessage.text}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {profileLoading ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security / 2FA section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Sicherheit</h2>
        <p className="text-xs text-slate-500 mb-6">Schütze dein Benutzerkonto vor unbefugtem Zugriff.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="font-semibold text-slate-800 text-sm">Zwei-Faktor-Authentisierung (2FA)</p>
              <p className="text-xs text-slate-500 mt-0.5">Schickt bei jedem neuen Login ein Einmalpasswort per E-Mail.</p>
            </div>
            <button
              onClick={() => {
                setShow2faConfirm(true);
                setError2fa(null);
                setPwd2fa('');
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                twoFactor ? 'bg-brand-600' : 'bg-slate-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                twoFactor ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {show2faConfirm && (
            <form onSubmit={handleToggle2fa} className="p-4 rounded-2xl border border-brand-200 bg-brand-50/50 space-y-3 transition-all">
              <p className="text-xs font-semibold text-slate-700">
                Sicherheitsüberprüfung: Bitte gib dein Passwort ein, um die 2FA {twoFactor ? 'zu DEAKTIVIEREN' : 'zu AKTIVIEREN'}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  required
                  placeholder="Dein Passwort"
                  value={pwd2fa}
                  onChange={(e) => setPwd2fa(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading2fa}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {loading2fa ? 'Prüfen...' : 'Bestätigen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShow2faConfirm(false);
                      setPwd2fa('');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
              {error2fa && <p className="text-xs font-semibold text-red-600 mt-1">{error2fa}</p>}
            </form>
          )}
        </div>
      </div>

      {/* 3. Danger Zone / Deletion section */}
      <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6">
        <h2 className="text-lg font-bold text-red-900 mb-2">Konto löschen</h2>
        <p className="text-xs text-red-700 mb-6">
          Dieser Vorgang kann nicht rückgängig gemacht werden. Personenbezogene Daten werden unwiderruflich entfernt oder anonymisiert.
        </p>

        <div>
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeletePassword('');
              setDeleteConfirmText('');
              setDeleteError(null);
            }}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            Konto löschen
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900">Konto unwiderruflich löschen?</h3>
            
            <div className="mt-3 space-y-2 text-xs text-slate-500 leading-relaxed">
              <p className="font-semibold text-red-600">Achtung: Dies ist eine finale Aktion!</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Bestehende eSIM Cash Guthaben verfallen komplett und werden nicht erstattet.</li>
                <li>Du verlierst den Zugriff auf deine Bestellübersicht und eSIM Details.</li>
                <li>Aus gesetzlichen Gründen müssen wir Rechnungsbelege 10 Jahre aufbewahren. Deine Profildaten werden anonymisiert, Transaktionsdaten bleiben erhalten.</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteAccount} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bestätigungstext</label>
                <p className="text-xs text-slate-500 mb-2">Bitte tippe das Wort <strong className="text-slate-800 font-bold select-all">LÖSCHEN</strong> ein:</p>
                <input
                  type="text"
                  required
                  placeholder="LÖSCHEN"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Passwort</label>
                <input
                  type="password"
                  required
                  placeholder="Dein aktuelles Passwort"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText !== 'LÖSCHEN' || !deletePassword || deleteLoading}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? 'Löschen...' : 'Konto unwiderruflich löschen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
