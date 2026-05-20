import Link from 'next/link';

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen bg-groww-bg">
      <header className="border-b border-groww-border bg-groww-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-groww-primary">
            VirtualTrade
          </Link>
          <nav className="flex gap-4 text-sm text-groww-muted">
            <Link href="/legal/terms" className="hover:text-groww-primary">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-groww-primary">
              Privacy
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-groww-primary">
              Disclaimer
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
