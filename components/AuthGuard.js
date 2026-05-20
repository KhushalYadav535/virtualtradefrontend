'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, init } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setLoading(false);
    }
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return children;
}