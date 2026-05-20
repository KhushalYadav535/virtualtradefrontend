export const metadata = { title: 'Disclaimer — VirtualTrade' };

export default function DisclaimerPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Disclaimer</h1>
      <section className="space-y-4 text-gray-700">
        <p className="text-lg font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
          VirtualTrade is a simulation only. No real brokerage account is created and no real orders are placed
          on NSE, BSE, or any exchange.
        </p>
        <p>
          Prices may be delayed or synthetic for demonstration. Past simulated performance does not guarantee future
          results. Always consult a SEBI-registered advisor before real investing.
        </p>
        <p>
          Indian market hours (9:15–15:30 IST, Mon–Fri) apply to market-order simulation where configured.
        </p>
      </section>
    </article>
  );
}
