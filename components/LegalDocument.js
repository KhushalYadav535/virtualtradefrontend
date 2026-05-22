'use client';

import Link from 'next/link';
import { getLegalPage, APP_INFO, NAV } from '../lib/legalContent';

export default function LegalDocument({ slug }) {
  const page = getLegalPage(slug);
  if (!page) {
    return (
      <article>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <Link href="/legal" className="text-groww-primary text-sm mt-4 inline-block">
          Back to legal hub
        </Link>
      </article>
    );
  }

  return (
    <article className="max-w-none">
      <p className="text-sm text-gray-500 mb-2">
        <Link href="/legal" className="text-groww-primary hover:underline">
          Legal
        </Link>
        {' / '}
        <span>{page.title}</span>
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{page.title}</h1>
      <p className="text-gray-600 mb-1">{page.summary}</p>
      <p className="text-xs text-gray-400 mb-8">Last updated: {page.lastUpdated}</p>

      <div className="space-y-8 text-gray-700">
        {page.sections.map((sec) => (
          <section key={sec.heading}>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{sec.heading}</h2>
            {sec.paragraphs.map((p, i) => (
              <p key={i} className="mb-3 leading-relaxed text-[15px]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Other policies</p>
        <div className="flex flex-wrap gap-3">
          {NAV.filter((n) => n.slug !== page.slug).map((n) => (
            <Link
              key={n.slug}
              href={`/legal/${n.slug}`}
              className="text-sm text-groww-primary hover:underline"
            >
              {n.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-6">
          {APP_INFO.name} v{APP_INFO.webVersion} · API {APP_INFO.version} · {APP_INFO.complianceNote}
        </p>
      </div>
    </article>
  );
}
