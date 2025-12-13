import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <section className="landing-hero shadow-soft space-y-4">
        <div className="relative space-y-3">
          <p className="text-sm text-gray-600">HSA Reimbursement Tracker</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Track your out-of-pocket medical expenses and get reimbursed,
            tax-free.
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            HSA Tracker helps you log eligible expenses, store receipts, and
            know exactly how much you can reimburse from your Health Savings
            Account – whenever you&apos;re ready.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-2 relative">
          <Link href="/login" className="btn">
            Get started
          </Link>
          <Link
            href="/login"
            className="text-sm text-blue-600 underline flex items-center"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </section>

      {/* How HSA reimbursements work */}
      <section className="rounded p-4 bg-white shadow-soft section-card space-y-3">
        <h2 className="text-lg card-title">How HSA reimbursements work</h2>
        <p className="text-sm text-gray-600">
          With an HSA, you can pay out of pocket today and reimburse yourself
          later — as long as you keep good records. HSA Tracker keeps those
          records for you.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Pay for eligible medical expenses out-of-pocket.</li>
          <li>Log each expense in HSA Tracker and attach the receipt.</li>
          <li>
            When you&apos;re ready, reimburse yourself from your HSA and record
            the reimbursement.
          </li>
          <li>
            Export a clean report for your tax files or for your HSA provider.
          </li>
        </ol>
      </section>

      {/* Key features */}
      <section className="rounded p-4 bg-white shadow-soft section-card space-y-4">
        <h2 className="text-lg card-title">Everything you need to stay audit-ready</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900">
              Store receipts & categorize expenses
            </h3>
            <p className="text-gray-600">
              Capture office visits, prescriptions, dental work, and more.
              Attach multiple receipts and keep everything organized by
              category.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900">
              Track total reimbursable amount
            </h3>
            <p className="text-gray-600">
              See how much you&apos;ve spent, how much has been reimbursed, and
              what&apos;s still available to withdraw tax-free.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900">Export for taxes</h3>
            <p className="text-gray-600">
              Generate CSV exports you can share with your accountant or keep
              with your tax records in case of an IRS audit.
            </p>
          </div>
        </div>
      </section>

      {/* Simple product preview */}
      <section className="rounded p-4 bg-white shadow-soft section-card space-y-3">
        <h2 className="text-lg card-title">See your reimbursements at a glance</h2>
        <p className="text-sm text-gray-600">
          The dashboard shows your total eligible expenses, reimbursements, and
          remaining balance — plus a detailed view of each expense and receipt.
        </p>
        <div className="summary-row">
          <div className="summary-card">
            <div className="summary-label">Total eligible</div>
            <div className="summary-value">$4,250.35</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total reimbursed</div>
            <div className="summary-value">$1,780.00</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Remaining</div>
            <div className="summary-value">$2,470.35</div>
          </div>
        </div>
      </section>
    </main>
  );
}


