'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { clearAuthSession } from '../../../lib/authSession';
import { User, Shield, Lock, Loader2, Eye, EyeOff, Bell, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import PushNotificationToggle from '../../../components/PushNotificationToggle';

const DEFAULT_TRADING_PREFS = {
  chartTheme: 'dark',
  defaultOrderType: 'MARKET',
  defaultProductType: 'MIS',
  qtyInputMode: 'lots',
  lotRounding: 'up',
  soundEffects: true,
  orderPin: false,
  defaultWatchlist: 'My Watchlist'
};

function mergeTradingPrefs(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TRADING_PREFS };
  return { ...DEFAULT_TRADING_PREFS, ...raw };
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('profile');
  const [tradingPrefs, setTradingPrefs] = useState(() => ({ ...DEFAULT_TRADING_PREFS }));
  const [tradingPrefsSaving, setTradingPrefsSaving] = useState(false);
  const [tradingPrefsMsg, setTradingPrefsMsg] = useState('');

  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [twoFA, setTwoFA] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [setupStep, setSetupStep] = useState('initial');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [locale, setLocale] = useState('en');
  const [notifPrefs, setNotifPrefs] = useState({
    orders: true,
    alerts: true,
    achievements: true,
    marketing: false
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  const applyUserToForm = (u) => {
    if (!u) return;
    setProfileName(u.name || '');
    setProfileEmail(u.email || '');
    setProfilePhone(u.phone || '');
    setProfileDob(u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '');
    setLocale(u.locale || 'en');
    if (u.notificationPrefs) {
      setNotifPrefs({
        orders: u.notificationPrefs.orders !== false,
        alerts: u.notificationPrefs.alerts !== false,
        achievements: u.notificationPrefs.achievements !== false,
        marketing: u.notificationPrefs.marketing === true
      });
    }
    setTradingPrefs(mergeTradingPrefs(u.tradingPrefs));
  };

  const loadProfile = async () => {
    try {
      const { data } = await auth.getProfile();
      setUser(data.user);
      applyUserToForm(data.user);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.name) applyUserToForm(user);
    else loadProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      const { data } = await auth.updateProfile({
        name: profileName,
        email: profileEmail || null,
        phone: profilePhone || null,
        dateOfBirth: profileDob || null,
        locale
      });
      setUser({ ...user, ...data.user });
      applyUserToForm(data.user);
      setProfileMsg('Profile updated successfully');
    } catch (err) {
      setProfileErr(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteErr('');
    if (!window.confirm('This will deactivate your account. You will not be able to log in again. Continue?')) {
      return;
    }
    setDeleteLoading(true);
    try {
      await auth.deleteAccount(deletePassword);
      clearAuthSession();
      router.replace('/');
    } catch (err) {
      setDeleteErr(err.response?.data?.error || err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErr('');
    setPasswordMsg('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordErr('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErr('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await auth.changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword });
      setPasswordMsg('Password changed successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordErr(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setSetupLoading(true);
    try {
      const { data } = await auth.setup2FA();
      setTwoFA(data);
      setSetupStep('qr');
    } catch (err) {
      console.error(err);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setNotifMsg('');
    setNotifSaving(true);
    try {
      const { data } = await auth.updateProfile({ notificationPrefs: notifPrefs });
      setUser({ ...user, notificationPrefs: data.user?.notificationPrefs || notifPrefs });
      setNotifMsg('Notification preferences saved');
    } catch (err) {
      setNotifMsg(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSaveTradingPrefs = async () => {
    setTradingPrefsMsg('');
    setTradingPrefsSaving(true);
    try {
      const { data } = await auth.updateProfile({ tradingPrefs });
      const next = mergeTradingPrefs(data.user?.tradingPrefs);
      setTradingPrefs(next);
      setUser({ ...user, tradingPrefs: next });
      setTradingPrefsMsg('Trading preferences saved');
    } catch (err) {
      setTradingPrefsMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to save');
    } finally {
      setTradingPrefsSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verifyToken || verifyToken.length !== 6) return;
    setDisableLoading(true);
    try {
      await auth.disable2FA(verifyToken);
      loadProfile();
      setSetupStep('initial');
      setTwoFA(null);
      setVerifyToken('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Manage your account and security</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 space-y-1">
          <button
            onClick={() => setTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              tab === 'profile' ? 'bg-groww-primary-light text-groww-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </div>
          </button>
          <button
            onClick={() => setTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              tab === 'security' ? 'bg-groww-primary-light text-groww-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </div>
          </button>
          <button
            onClick={() => setTab('notifications')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              tab === 'notifications' ? 'bg-groww-primary-light text-groww-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </div>
          </button>
          <button
            onClick={() => setTab('trading')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              tab === 'trading' ? 'bg-groww-primary-light text-groww-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trading
            </div>
          </button>
          <button
            onClick={() => setTab('about')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              tab === 'about' ? 'bg-groww-primary-light text-groww-primary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Legal & About
            </div>
          </button>
        </div>

        <div className="flex-1">
          {tab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Profile Information</h2>
              {profileMsg && <p className="text-sm text-green-600 mb-4">{profileMsg}</p>}
              {profileErr && <p className="text-sm text-red-600 mb-4">{profileErr}</p>}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      minLength={2}
                      maxLength={100}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                    <input
                      type="date"
                      value={profileDob}
                      onChange={(e) => setProfileDob(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (partial UI)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 capitalize"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
                  <input
                    type="text"
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save changes
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-red-100">
                <h3 className="text-red-700 font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger zone
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Deactivate your account. Paper trading history remains in the system but you cannot sign in again.
                </p>
                {deleteErr && <p className="text-sm text-red-600 mb-2">{deleteErr}</p>}
                <form onSubmit={handleDeleteAccount} className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-gray-600 mb-1">Confirm with password</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-4 py-2 border border-red-200 rounded-lg"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete account'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        value={passwordForm.oldPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOld(!showOld)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  {passwordErr && <p className="text-red-500 text-sm">{passwordErr}</p>}
                  {passwordMsg && <p className="text-green-500 text-sm">{passwordMsg}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Two-Factor Authentication (2FA)
                </h2>

                {(user?.has2FA || user?.totp_secret) ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Enabled</span>
                    </div>
                    <p className="text-gray-600 mb-4">2FA is currently active on your account. Enter code to disable.</p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="px-4 py-2 border rounded-lg w-32 text-center"
                        maxLength={6}
                      />
                      <button
                        onClick={handleDisable2FA}
                        disabled={disableLoading || verifyToken.length !== 6}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-4">Add an extra layer of security to your account using Google Authenticator.</p>
                    {setupStep === 'initial' && (
                      <button
                        onClick={handleSetup2FA}
                        disabled={setupLoading}
                        className="px-6 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50"
                      >
                        {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
                      </button>
                    )}
                    {setupStep === 'qr' && twoFA && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Scan this QR code with your Google Authenticator app:</p>
                        <img src={twoFA.qrCode} alt="2FA QR Code" className="w-48 h-48 border rounded-lg" />
                        <p className="text-xs text-gray-500">Manual code: {twoFA.secret}</p>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={verifyToken}
                            onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="px-4 py-2 border rounded-lg w-32 text-center"
                            maxLength={6}
                          />
                          <button
                            onClick={() => setSetupStep('initial')}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Browser push
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Enable push on this device for orders and alerts (requires VAPID keys on server).
                </p>
                <PushNotificationToggle />
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Notification categories</h3>
                {notifMsg && <p className="text-sm text-gray-600 mb-3">{notifMsg}</p>}
                <div className="space-y-3">
                  {[
                    { key: 'orders', label: 'Order updates', desc: 'Executions, cancellations' },
                    { key: 'alerts', label: 'Price & volume alerts', desc: 'When your alerts trigger' },
                    { key: 'achievements', label: 'Achievements', desc: 'Badges and milestones' },
                    { key: 'marketing', label: 'Tips & updates', desc: 'Product announcements' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[item.key]}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-gray-800 block">{item.label}</span>
                        <span className="text-xs text-gray-500">{item.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSaveNotificationPrefs}
                  disabled={notifSaving}
                  className="mt-4 px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {notifSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save preferences
                </button>
              </div>
            </div>
          )}
          {tab === 'trading' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trading Preferences
                </h2>
                <p className="text-sm text-gray-500 mb-6">Customize your trading experience and defaults.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Chart Theme</label>
                   <select value={tradingPrefs.chartTheme} onChange={(e) => setTradingPrefs({...tradingPrefs, chartTheme: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="light">Light</option>
                     <option value="dark">Dark</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Default Order Type</label>
                   <select value={tradingPrefs.defaultOrderType} onChange={(e) => setTradingPrefs({...tradingPrefs, defaultOrderType: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="MARKET">Market Order</option>
                     <option value="LIMIT">Limit Order</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Default Product Type</label>
                   <select value={tradingPrefs.defaultProductType} onChange={(e) => setTradingPrefs({...tradingPrefs, defaultProductType: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="MIS">MIS (Intraday)</option>
                     <option value="CNC">CNC (Delivery)</option>
                     <option value="NRML">NRML (Margin)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Input Mode</label>
                   <select value={tradingPrefs.qtyInputMode} onChange={(e) => setTradingPrefs({...tradingPrefs, qtyInputMode: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="lots">By Lots (Recommended for F&O)</option>
                     <option value="shares">By Shares</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Lot Rounding Preference</label>
                   <select value={tradingPrefs.lotRounding} onChange={(e) => setTradingPrefs({...tradingPrefs, lotRounding: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="up">Round Up (Ceil)</option>
                     <option value="down">Round Down (Floor)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Default Watchlist</label>
                   <select value={tradingPrefs.defaultWatchlist} onChange={(e) => setTradingPrefs({...tradingPrefs, defaultWatchlist: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                     <option value="My Watchlist">My Watchlist</option>
                     <option value="Nifty 50">Nifty 50</option>
                     <option value="Bank Nifty">Bank Nifty</option>
                   </select>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                 {tradingPrefsMsg && (
                   <p className={`text-sm ${tradingPrefsMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{tradingPrefsMsg}</p>
                 )}
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={tradingPrefs.soundEffects} onChange={(e) => setTradingPrefs({...tradingPrefs, soundEffects: e.target.checked})} className="w-4 h-4 text-groww-primary" />
                   <div>
                      <p className="font-medium text-gray-800">Sound Effects & Haptics</p>
                      <p className="text-xs text-gray-500">Play sound on order execution</p>
                   </div>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={tradingPrefs.orderPin} onChange={(e) => setTradingPrefs({...tradingPrefs, orderPin: e.target.checked})} className="w-4 h-4 text-groww-primary" />
                   <div>
                      <p className="font-medium text-gray-800">Order PIN Verification</p>
                      <p className="text-xs text-gray-500">Require PIN before placing trades</p>
                   </div>
                 </label>
              </div>

              <button
                type="button"
                disabled={tradingPrefsSaving}
                onClick={handleSaveTradingPrefs}
                className="mt-4 px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {tradingPrefsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save preferences
              </button>
            </div>
          )}

          {tab === 'about' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Legal & Information
                </h2>
                <p className="text-sm text-gray-500 mb-6">Important policies and terms for VirtualTrade.</p>
              </div>

              <div className="space-y-4">
                 {[
                   { title: 'Terms of Service', desc: 'Educational use rules and disclaimers' },
                   { title: 'Privacy Policy', desc: 'How we handle your simulation data' },
                   { title: 'Data Usage Policy', desc: 'Usage of analytics for leaderboards' },
                   { title: 'Cookie Policy', desc: 'Strictly necessary session mechanisms' },
                   { title: 'Disclaimer', desc: 'No real money or real securities involved' },
                   { title: 'Licenses & Attributions', desc: 'Open source software notices' }
                 ].map((doc, i) => (
                    <div key={i} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center transition">
                       <div>
                         <h3 className="font-semibold text-gray-800">{doc.title}</h3>
                         <p className="text-sm text-gray-500">{doc.desc}</p>
                       </div>
                       <div className="text-groww-primary font-medium text-sm">View</div>
                    </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}