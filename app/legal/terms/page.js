export const metadata = { title: 'Terms of Service — VirtualTrade' };

export default function TermsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
      <p className="text-gray-600 mb-4">Last updated: May 2026</p>
      <section className="space-y-4 text-gray-700">
        <p>
          VirtualTrade is an educational paper-trading platform. By using this service you agree that no real
          securities are bought or sold and no real money is at risk.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Use of the platform</h2>
        <p>
          You must provide accurate registration information. Accounts are for learning purposes. Misuse,
          automated scraping, or attempts to disrupt the service may result in suspension.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">No investment advice</h2>
        <p>
          Market data and simulated P&amp;L are for practice only. Nothing on VirtualTrade constitutes financial,
          legal, or tax advice.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Limitation of liability</h2>
        <p>
          The platform is provided &quot;as is&quot;. We are not liable for decisions made based on simulated trades or
          delayed market data.
        </p>
      </section>
    </article>
  );
}
