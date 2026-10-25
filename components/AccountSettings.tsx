'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

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

interface SessionItem {
  id: string;
  isCurrent: boolean;
  deviceDescription: string;
  deviceType: string;
  browser: string;
  os: string;
  ipMasked: string;
  createdAt: string;
  lastActiveAt: string;
}

export function AccountSettings({ user, profile }: AccountSettingsProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();

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

  // Password Change state (Section 5.1)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Sessions state (Section 5.2)
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeOthersModal, setShowRevokeOthersModal] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [sessionsMessage, setSessionsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Live announcer
  const [liveMessage, setLiveMessage] = useState('');

  // Modal focus refs
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const revokeOthersModalRef = useRef<HTMLDivElement>(null);
  const modal2faRef = useRef<HTMLDivElement>(null);

  // Fetch active sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/user/sessions');
      const data = await res.json();
      if (res.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Modal keydown listeners (Esc & focus trap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) setShowDeleteModal(false);
        if (showRevokeOthersModal) setShowRevokeOthersModal(false);
        if (show2faConfirm) setShow2faConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal, showRevokeOthersModal, show2faConfirm]);

  // 1. Resend verification email
  const handleResendVerification = async () => {
    setVerificationLoading(true);
    setVerificationSent(false);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden');
      setVerificationSent(true);
      setLiveMessage(t('settings_resend_sent'));
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
        body: JSON.stringify({ name, phone, billing_address: billingAddress, email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('settings_save_failed'));

      const msg = data.emailChangePending
        ? t('settings_email_change_pending')
        : t('settings_profile_saved');
      setProfileMessage({ type: 'success', text: msg });
      setLiveMessage(msg);
      router.refresh();
    } catch (err: any) {
      const msg = err.message || t('settings_save_failed');
      setProfileMessage({ type: 'error', text: msg });
      setLiveMessage(msg);
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
      const statusText = targetState ? '2FA aktiviert' : '2FA deaktiviert';
      setLiveMessage(statusText);
      router.refresh();
    } catch (err: any) {
      setError2fa(err.message || 'Passwort-Bestätigung fehlgeschlagen');
    } finally {
      setLoading2fa(false);
    }
  };

  // 4. Change Password (Section 5.1)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (newPassword.length < 8) {
      setPwdMessage({ type: 'error', text: t('settings_pwd_too_short') });
      setLiveMessage(t('settings_pwd_too_short'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: t('settings_pwd_mismatch') });
      setLiveMessage(t('settings_pwd_mismatch'));
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.message || 'Fehler beim Ändern des Passworts.';
        if (data.error === 'settings_pwd_wrong_current') msg = t('settings_pwd_wrong_current');
        if (data.error === 'settings_pwd_too_short') msg = t('settings_pwd_too_short');
        if (data.error === 'rate_limited') {
          msg = `Zu viele Versuche. Bitte warte ${data.retryAfter || 30} Sekunden.`;
        }
        throw new Error(msg);
      }

      const successMsg = t('settings_pwd_changed_success');
      setPwdMessage({ type: 'success', text: successMsg });
      setLiveMessage(successMsg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchSessions();
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message });
      setLiveMessage(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  // 5. Revoke single session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setSessionsMessage(null);
    try {
      const res = await fetch('/api/user/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Abmelden der Sitzung');

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setLiveMessage('Sitzung erfolgreich abgemeldet.');
    } catch (err: any) {
      setSessionsMessage({ type: 'error', text: err.message });
    } finally {
      setRevokingId(null);
    }
  };

  // 6. Revoke all other sessions
  const handleRevokeOtherSessions = async () => {
    setRevokingOthers(true);
    setSessionsMessage(null);
    try {
      const res = await fetch('/api/user/sessions/revoke-others', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Abmelden anderer Sitzungen');

      setShowRevokeOthersModal(false);
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setLiveMessage('Alle anderen Sitzungen wurden erfolgreich abgemeldet.');
    } catch (err: any) {
      setSessionsMessage({ type: 'error', text: err.message });
    } finally {
      setRevokingOthers(false);
    }
  };

  // 7. Delete Account Action
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
  const expectedDeleteWord = t('settings_delete_confirm_word') || 'LÖSCHEN';

  return (
    <div className="space-y-8">
      {/* Polite Live Region for status notifications */}
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* ⚠️ Email verification warning banner */}
      {!isVerified && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" role="img" aria-hidden="true">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">{t('settings_verify_warning_title')}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('settings_verify_warning_sub')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={verificationLoading || verificationSent}
            className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs transition-all inline-flex items-center justify-center ${
              verificationSent
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {verificationLoading
              ? t('settings_resend_sending')
              : verificationSent
              ? t('settings_resend_sent')
              : t('settings_resend_verify_btn')}
          </button>
        </div>
      )}

      {/* 1. Profile section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 mb-1">{t('settings_profile_title')}</h2>
        <p className="text-xs text-slate-500 mb-6">{t('settings_profile_sub')}</p>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                {t('settings_name_label')}
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings_name_placeholder')}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                {t('settings_phone_label')}
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('settings_phone_placeholder')}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              {t('settings_email_label')}
            </label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>

          <div>
            <label htmlFor="settings-billing" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              {t('settings_billing_label')}
            </label>
            <textarea
              id="settings-billing"
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder={t('settings_billing_placeholder')}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none transition-all"
            />
          </div>

          {profileMessage && (
            <div
              role="alert"
              className={`p-4 rounded-xl text-xs font-medium ${
                profileMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="min-h-[44px] rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-xs inline-flex items-center justify-center"
            >
              {profileLoading ? t('settings_saving_btn') : t('settings_save_btn')}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security Section (2FA & Password Change) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{t('settings_security_title')}</h2>
          <p className="text-xs text-slate-500">{t('settings_security_sub')}</p>
        </div>

        {/* 2FA Toggle Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p className="font-semibold text-slate-800 text-sm">{t('settings_2fa_title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('settings_2fa_desc')}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-600">
              {twoFactor ? 'Aktiv' : 'Inaktiv'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={twoFactor}
              aria-label={t('settings_2fa_switch_label')}
              onClick={() => {
                setShow2faConfirm(true);
                setError2fa(null);
                setPwd2fa('');
              }}
              className="min-h-[44px] min-w-[44px] p-2 inline-flex items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  twoFactor ? 'bg-brand-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    twoFactor ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* 2FA Confirmation Dialog */}
        {show2faConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-2fa-title"
              ref={modal2faRef}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
            >
              <h3 id="dialog-2fa-title" className="text-base font-bold text-slate-900">
                {twoFactor ? t('settings_2fa_confirm_disable') : t('settings_2fa_confirm_enable')}
              </h3>
              <form onSubmit={handleToggle2fa} className="space-y-4">
                <div>
                  <label htmlFor="settings-2fa-pwd" className="block text-xs font-semibold text-slate-600 mb-1">
                    {t('settings_delete_pwd_label')}
                  </label>
                  <input
                    id="settings-2fa-pwd"
                    type="password"
                    required
                    autoFocus
                    placeholder={t('settings_2fa_pwd_placeholder')}
                    value={pwd2fa}
                    onChange={(e) => setPwd2fa(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                {error2fa && (
                  <div role="alert" className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                    {error2fa}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShow2faConfirm(false);
                      setPwd2fa('');
                    }}
                    className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {t('settings_cancel_btn')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading2fa || !pwd2fa}
                    className="min-h-[44px] rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {loading2fa ? t('settings_checking_btn') : t('settings_confirm_btn')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section 5.1: Passwort ändern */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-1">{t('settings_pwd_title')}</h3>
          <p className="text-xs text-slate-500 mb-4">{t('settings_pwd_sub')}</p>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            {/* Current Password */}
            <div>
              <label htmlFor="settings-current-pwd" className="block text-xs font-semibold text-slate-600 mb-1">
                {t('settings_pwd_current_label')}
              </label>
              <div className="relative">
                <input
                  id="settings-current-pwd"
                  type={showCurrentPwd ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('settings_pwd_current_placeholder')}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-4 pr-12 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  aria-label={showCurrentPwd ? t('settings_pwd_hide') : t('settings_pwd_show')}
                  className="absolute right-0 top-0 bottom-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showCurrentPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* New Password & Repeat */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-new-pwd" className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('settings_pwd_new_label')}
                </label>
                <div className="relative">
                  <input
                    id="settings-new-pwd"
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('settings_pwd_new_placeholder')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-4 pr-12 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    aria-label={showNewPwd ? t('settings_pwd_hide') : t('settings_pwd_show')}
                    className="absolute right-0 top-0 bottom-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showNewPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="settings-confirm-pwd" className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('settings_pwd_confirm_label')}
                </label>
                <div className="relative">
                  <input
                    id="settings-confirm-pwd"
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('settings_pwd_confirm_placeholder')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-4 pr-12 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    aria-label={showConfirmPwd ? t('settings_pwd_hide') : t('settings_pwd_show')}
                    className="absolute right-0 top-0 bottom-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            {pwdMessage && (
              <div
                role="alert"
                className={`p-3 rounded-xl text-xs font-medium ${
                  pwdMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {pwdMessage.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
                className="min-h-[44px] rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs inline-flex items-center justify-center"
              >
                {pwdLoading ? t('settings_pwd_changing_btn') : t('settings_pwd_change_btn')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 5.2: Aktive Sitzungen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{t('settings_sessions_title')}</h2>
            <p className="text-xs text-slate-500">{t('settings_sessions_sub')}</p>
          </div>
          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <button
              type="button"
              onClick={() => setShowRevokeOthersModal(true)}
              className="min-h-[44px] rounded-xl border border-red-200 bg-red-50/50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors shrink-0 inline-flex items-center justify-center"
            >
              {t('settings_sessions_revoke_all_btn')}
            </button>
          )}
        </div>

        {sessionsMessage && (
          <div
            role="alert"
            className={`p-3 rounded-xl text-xs font-medium ${
              sessionsMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {sessionsMessage.text}
          </div>
        )}

        {sessionsLoading ? (
          <div className="p-6 text-center text-xs text-slate-400">...</div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">Keine aktiven Sitzungen gefunden.</div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {sessions.map((sess) => (
              <div key={sess.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5" aria-hidden="true">
                    {sess.deviceType === 'Smartphone' ? '📱' : sess.deviceType === 'Tablet' ? '📟' : '💻'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-xs">{sess.deviceDescription}</span>
                      {sess.isCurrent && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {t('settings_sessions_current_device')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                      <span>IP: <code className="font-mono text-slate-600">{sess.ipMasked}</code></span>
                      <span>{t('settings_sessions_last_active')} {new Date(sess.lastActiveAt).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    disabled={revokingId === sess.id}
                    className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors shrink-0 inline-flex items-center justify-center"
                  >
                    {revokingId === sess.id ? t('settings_sessions_revoking') : t('settings_sessions_revoke_btn')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Revoke All Others Confirmation Modal */}
        {showRevokeOthersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-revoke-others-title"
              ref={revokeOthersModalRef}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
            >
              <h3 id="dialog-revoke-others-title" className="text-base font-bold text-slate-900">
                {t('settings_sessions_revoke_all_confirm_title')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('settings_sessions_revoke_all_confirm_desc')}
              </p>
              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowRevokeOthersModal(false)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('settings_cancel_btn')}
                </button>
                <button
                  type="button"
                  onClick={handleRevokeOtherSessions}
                  disabled={revokingOthers}
                  className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {revokingOthers ? t('settings_sessions_revoking') : t('settings_sessions_revoke_all_confirm_btn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Danger Zone / Deletion section */}
      <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 shadow-2xs">
        <h2 className="text-lg font-bold text-red-900 mb-1">{t('settings_delete_title')}</h2>
        <p className="text-xs text-red-700 mb-6 leading-relaxed">
          {t('settings_delete_sub')}
        </p>

        <div>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeletePassword('');
              setDeleteConfirmText('');
              setDeleteError(null);
            }}
            className="min-h-[44px] rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-xs inline-flex items-center justify-center"
          >
            {t('settings_delete_btn')}
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-delete-title"
            ref={deleteModalRef}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h3 id="dialog-delete-title" className="text-lg font-bold text-slate-900">{t('settings_delete_modal_title')}</h3>

            <div className="mt-3 space-y-2 text-xs text-slate-500 leading-relaxed">
              <p className="font-semibold text-red-600">{t('settings_delete_warning_bold')}</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t('settings_delete_bullet_cash')}</li>
                <li>{t('settings_delete_bullet_orders')}</li>
                <li>{t('settings_delete_bullet_retention')}</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteAccount} className="mt-6 space-y-4">
              <div>
                <label htmlFor="settings-delete-confirm-word" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  {t('settings_delete_confirm_prompt', { word: expectedDeleteWord })}
                </label>
                <input
                  id="settings-delete-confirm-word"
                  type="text"
                  required
                  autoFocus
                  placeholder={expectedDeleteWord}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="settings-delete-pwd" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  {t('settings_delete_pwd_label')}
                </label>
                <input
                  id="settings-delete-pwd"
                  type="password"
                  required
                  placeholder={t('settings_delete_pwd_placeholder')}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-red-500"
                />
              </div>

              {deleteError && (
                <div role="alert" className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
                >
                  {t('settings_cancel_btn')}
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText.trim().toUpperCase() !== expectedDeleteWord.toUpperCase() || !deletePassword || deleteLoading}
                  className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center shadow-xs"
                >
                  {deleteLoading ? t('settings_delete_submitting_btn') : t('settings_delete_submit_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
