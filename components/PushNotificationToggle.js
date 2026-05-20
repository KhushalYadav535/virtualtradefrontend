'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle } from 'lucide-react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxEIkv_3FqmKBjZcNpnmD4yDGbVAmz3N6N7zA7s2e0xR2vZ7zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2zX2';

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage('Push notifications not supported in this browser');
      return;
    }

    setSubscribing(true);
    setMessage('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      setIsSubscribed(true);
      setMessage('Notifications enabled!');
    } catch (err) {
      console.error(err);
      setMessage('Failed to enable notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setSubscribing(true);
    setMessage('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/push/unsubscribe', { method: 'DELETE' });
      setIsSubscribed(false);
      setMessage('Notifications disabled');
    } catch (err) {
      console.error(err);
      setMessage('Failed to disable notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const testNotification = async () => {
    setMessage('Sending test notification...');
    try {
      const { data } = await fetch('/api/push/test', { method: 'POST' }).then(r => r.json());
      setMessage(data.sent ? 'Test notification sent!' : 'Failed to send test');
    } catch (err) {
      setMessage('Failed to send test');
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking...</span>
      </div>
    );
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return (
      <div className="text-sm text-gray-500">
        Push notifications not supported
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-600" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-gray-800">Push Notifications</p>
            <p className="text-xs text-gray-500">
              {isSubscribed ? 'Enabled - receive order updates' : 'Disabled'}
            </p>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          disabled={subscribing}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isSubscribed
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } disabled:opacity-50`}
        >
          {subscribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </button>
      </div>

      {isSubscribed && (
        <button
          onClick={testNotification}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Send Test Notification
        </button>
      )}

      {message && (
        <div className={`flex items-center gap-2 text-sm ${message.includes('enabled') || message.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
          {message.includes('enabled') || message.includes('sent') ? (
            <CheckCircle className="w-4 h-4" />
          ) : null}
          {message}
        </div>
      )}
    </div>
  );
}