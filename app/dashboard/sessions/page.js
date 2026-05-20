'use client';

import { useEffect, useState } from 'react';
import { auth } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { monitor, devices } from 'lucide-react';
import { Loader2, Trash2, LogOut, AlertCircle } from 'lucide-react';

export default function SessionsPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data } = await auth.getSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await auth.revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error(err);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('This will log out all other devices. Continue?')) return;
    setLoading(true);
    try {
      await auth.revokeAllSessions();
      loadSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Active Sessions</h1>
          <p className="text-gray-500">Manage your logged-in devices</p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAll}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout All Other Devices
          </button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Security Notice</p>
          <p className="text-sm text-amber-700">
            Revoke sessions you don't recognize. Active sessions have access to your account.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Device</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Browser</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">IP Address</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Last Active</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-100">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <monitor className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">{session.device_info || 'Unknown Device'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {session.browser || 'Unknown'}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {session.ip_address || 'N/A'}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    {formatDate(session.last_active || session.created_at)}
                  </td>
                  <td className="py-4 px-6">
                    {session.is_current ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Current</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {!session.is_current && (
                      <button
                        onClick={() => handleRevoke(session.id)}
                        disabled={revoking === session.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        {revoking === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}