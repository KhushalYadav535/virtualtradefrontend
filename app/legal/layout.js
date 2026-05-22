import Link from 'next/link';
import { NAV, APP_INFO } from '../../lib/legalContent';

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen bg-groww-bg">
      <header className="border-b border-groww-border bg-groww-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="text-lg font-bold text-groww-primary">
            VirtualTrade
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-groww-muted">
            <Link href="/legal" className="hover:text-groww-primary font-medium">
              All legal
            </Link>
            {NAV.map((n) => (
              <Link key={n.slug} href={`/legal/${n.slug}`} className="hover:text-groww-primary">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
      <footer className="border-t border-groww-border py-6 text-center text-xs text-groww-muted">
        <p>
          {APP_INFO.name} v{APP_INFO.webVersion} · App v{APP_INFO.appVersion} · Last updated{' '}
          {APP_INFO.lastUpdated}
        </p>
        <p className="mt-1 max-w-lg mx-auto">{APP_INFO.complianceNote}</p>
      </footer>
    </div>
  );
}
