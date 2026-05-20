'use client';

import { useState, useEffect } from 'react';
import { auth } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { User, Shield, Lock, Loader2, Eye, EyeOff, Bell } from 'lucide-react';
import PushNotificationToggle from '../../../components/PushNotificationToggle';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('profile');

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

  const loadProfile = async () => {
    try {
      const { data } = await auth.getProfile();
      setUser(data.user);
    } catch (err) {
      console.error(err);
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
              tab === 'profile' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
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
              tab === 'security' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
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
              tab === 'notifications' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </div>
          </button>
        </div>

        <div className="flex-1">
          {tab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Profile Information</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    />
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
              </div>
              <p className="text-sm text-gray-500 mt-4">Contact admin to update profile information</p>
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
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
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

                {user?.totp_secret ? (
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
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Receive real-time notifications for order execution and updates.
              </p>
              <PushNotificationToggle />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}