"use client";

import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiFetchRaw } from "../../lib/apiClient";
import { formatCurrency } from "../../lib/formatCurrency";
import { DateField } from "../../components/DateField";

type ExpenseSummary = {
  expenseId: string;
  datePaid: string | null;
  lastReimbursedAt?: string | null;
  description: string | null;
  amount: number;
  reimbursed: number;
  remaining: number;
};

type SummaryResponse = {
  totalEligible: number;
  totalReimbursed: number;
  remaining: number;
  byCategory?: any[];
  byExpense: ExpenseSummary[];
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

  const summary: SummaryResponse = data ?? {
    totalEligible: 0,
    totalReimbursed: 0,
    remaining: 0,
    byCategory: [],
    byExpense: [],
  };

  function handleClearDates() {
    setCustomFrom("");
    setCustomTo("");
  }

  async function handleDownloadCsv() {
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
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl card-title">Reimbursement Summary</h1>
      </header>

      <section className="rounded p-4 space-y-3 bg-white shadow-soft section-card">
        <form
          onSubmit={handleApply}
          className="flex flex-col md:flex-row gap-4 items-start md:items-end"
        >
          <div>
            <label className="form-label">Year</label>
            <select
              className="form-control form-control--inline"
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
          <DateField
            label="From (optional)"
            value={customFrom}
            onChange={setCustomFrom}
            inline
          />
          <DateField
            label="To (optional)"
            value={customTo}
            onChange={setCustomTo}
            inline
          />
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button type="submit" className="btn">
              Apply
            </button>
            <button
              type="button"
              onClick={handleClearDates}
              className="btn"
              disabled={isLoading}
            >
              Clear dates
            </button>
          </div>
        </form>

        {isLoading ? (
          <p>Loading summary…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">
            Failed to load: {(error as Error).message}
          </p>
        ) : null}
      </section>

      <section className="metric-row">
        <div className="metric-card">
          <div className="metric-value">
            ${formatCurrency(summary.totalReimbursed)}
          </div>
          <div className="metric-label">Total reimbursement</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{summary.byExpense.length}</div>
          <div className="metric-label">Total expenses</div>
        </div>
      </section>

      <section className="rounded p-4 space-y-3 bg-white shadow-soft section-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg card-title">By Reimbursement Date</h2>
          <button
            type="button"
            className="btn"
            aria-label="Download reimbursements CSV"
            onClick={handleDownloadCsv}
            disabled={exporting}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="M8 11l4 4 4-4" />
              <path d="M4 19h16" />
            </svg>
          </button>
        </div>
        {exportError && (
          <p className="text-sm text-red-600">{exportError}</p>
        )}
        {summary.byExpense.length === 0 ? (
          <p>No reimbursements in this range.</p>
        ) : (
          <table className="table table-striped table-style-1">
            <thead>
              <tr>
                <th className="text-left">Date reimbursed</th>
                <th className="text-left">Expense</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Reimbursed</th>
                <th className="text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {summary.byExpense.map((e) => (
                <tr key={e.expenseId}>
                  <td>
                    {e.lastReimbursedAt
                      ? new Date(e.lastReimbursedAt).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    <a
                      href={`/expenses/${e.expenseId}`}
                      className="text-blue-600 underline"
                    >
                      {e.description || "View expense"}
                    </a>
                  </td>
                  <td className="text-right">
                    ${formatCurrency(e.amount)}
                  </td>
                  <td className="text-right">
                    ${formatCurrency(e.reimbursed)}
                  </td>
                  <td className="text-right">
                    ${formatCurrency(e.remaining)}
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


