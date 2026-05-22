import Link from 'next/link';
import { getLegalHub } from '../../lib/legalContent';

export const metadata = { title: 'Legal & Compliance — VirtualTrade' };

export default function LegalHubPage() {
  const { appInfo, pages, disclaimerShort } = getLegalHub();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal & Compliance</h1>
      <p className="text-gray-600 mb-2">{disclaimerShort}</p>
      <p className="text-sm text-gray-500 mb-8">
        {appInfo.name} · Web v{appInfo.webVersion} · App v{appInfo.appVersion} · API v{appInfo.version}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/legal/${p.slug}`}
            className="block p-5 rounded-xl border border-gray-200 bg-white hover:border-groww-primary hover:shadow-sm transition"
          >
            <h2 className="font-semibold text-gray-900">{p.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{p.summary}</p>
            <p className="text-xs text-gray-400 mt-3">Updated {p.lastUpdated}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 p-4 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">App version info</p>
        <p>Environment: {appInfo.environment}</p>
        <p className="mt-2 text-xs">{appInfo.complianceNote}</p>
      </div>
    </div>
  );
}
