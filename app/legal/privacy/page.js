export const metadata = { title: 'Privacy Policy — VirtualTrade' };

export default function PrivacyPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <p className="text-gray-600 mb-4">Last updated: May 2026</p>
      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold text-gray-800">Information we collect</h2>
        <p>
          We store account details (name, email), trading activity within the simulator, session tokens, and
          optional push notification preferences.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">How we use data</h2>
        <p>
          Data is used to operate the paper-trading experience, leaderboards, and admin/trainer dashboards for
          educational batches.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Security</h2>
        <p>
          Passwords are hashed. API access uses JWT. We do not sell personal information to third parties.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Your rights</h2>
        <p>
          Contact your institution administrator or platform admin to request account changes or data questions.
        </p>
      </section>
    </article>
  );
}
