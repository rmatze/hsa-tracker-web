"use client";

import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiFetchRaw } from "../../lib/apiClient";
import { formatCurrency } from "../../lib/formatCurrency";

type CategorySummary = {
  categoryId: string | null;
  categoryName: string;
  totalEligible: number;
  totalReimbursed: number;
  remaining: number;
};

type SummaryResponse = {
  totalEligible: number;
  totalReimbursed: number;
  remaining: number;
  byCategory: CategorySummary[];
};

export default function SummaryPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { data, isLoading, error, refetch } = useQuery<SummaryResponse>({
    queryKey: ["summary-overall", { year, customFrom, customTo }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
      if (!customFrom && !customTo && year) {
        params.set("from", `${year}-01-01`);
        params.set("to", `${year}-12-31`);
      }
      const qs = params.toString();
      return apiFetch(`/api/reimbursements/summary/overall${qs ? `?${qs}` : ""}`);
    },
  });

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function handleApply(e: FormEvent) {
    e.preventDefault();
    refetch();
  }

  const summary = data ?? {
    totalEligible: 0,
    totalReimbursed: 0,
    remaining: 0,
    byCategory: [],
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reimbursement Summary</h1>
      </header>

      <section className="border rounded p-4 space-y-3 bg-white">
        <form
          onSubmit={handleApply}
          className="flex flex-col md:flex-row gap-4 items-start md:items-end"
        >
          <div>
            <label className="block text-sm mb-1">Year</label>
            <select
              className="border px-2 py-1 rounded"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {/* simple range: current year and a few prior years */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = currentYear - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">From (optional)</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">To (optional)</label>
            <input
              type="date"
              className="border px-2 py-1 rounded"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-wide">
            Apply
          </button>
        </form>

        {isLoading ? (
          <p>Loading summary…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">
            Failed to load: {(error as Error).message}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          {exportError && (
            <p className="text-sm text-red-600">{exportError}</p>
          )}
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              try {
                setExportError(null);
                setExporting(true);

                const params = new URLSearchParams();
                if (customFrom) params.set("from", customFrom);
                if (customTo) params.set("to", customTo);
                if (!customFrom && !customTo && year) {
                  params.set("year", year);
                }
                const qs = params.toString();

                const res = await apiFetchRaw(
                  `/api/reimbursements/export${qs ? `?${qs}` : ""}`
                );
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const labelYear = year || new Date().getFullYear();
                a.href = url;
                a.download = `hsa-reimbursements-${labelYear}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (err) {
                setExportError((err as Error).message);
              } finally {
                setExporting(false);
              }
            }}
            className="ml-auto btn btn-primary btn-wide disabled:opacity-60"
          >
            {exporting ? "Downloading…" : `Download CSV for ${year}`}
          </button>
        </div>
      </section>

      <section className="summary-row">
        <div className="summary-card">
          <div className="summary-label">Total eligible</div>
          <div className="summary-value">
            ${formatCurrency(summary.totalEligible)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total reimbursed</div>
          <div className="summary-value">
            ${formatCurrency(summary.totalReimbursed)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Remaining</div>
          <div className="summary-value">
            ${formatCurrency(summary.remaining)}
          </div>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3 bg-white">
        <h2 className="text-lg font-semibold">By Category</h2>
        {summary.byCategory.length === 0 ? (
          <p>No data in this range.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Eligible</th>
                <th className="text-right py-2">Reimbursed</th>
                <th className="text-right py-2">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {summary.byCategory.map((c) => (
                <tr key={c.categoryId ?? "uncategorized"} className="border-b">
                  <td className="py-1">{c.categoryName}</td>
                  <td className="py-1 text-right">
                    ${formatCurrency(c.totalEligible)}
                  </td>
                  <td className="py-1 text-right">
                    ${formatCurrency(c.totalReimbursed)}
                  </td>
                  <td className="py-1 text-right">
                    ${formatCurrency(c.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}


