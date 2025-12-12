"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiClient";
import { formatCurrency } from "../lib/formatCurrency";

type Expense = {
  id: string;
  amount: string;
  date_paid: string;
  description: string | null;
  payment_method: string | null;
  category_name: string | null;
  total_reimbursed: string;
  remaining_to_reimburse: string;
  is_archived?: boolean;
};

type Category = {
  id: string;
  name: string;
};

type Summary = {
  totalEligible: number;
  totalReimbursed: number;
  remaining: number;
};
type NewExpensePayload = {
  amount: number;
  date_paid: string;
  payment_method: string;
  description?: string;
  category_id?: string | null;
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  const {
    data: expensesData,
    isLoading,
    error,
  } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => apiFetch("/api/expenses?status=active"),
  });

  const { data: summaryData } = useQuery<Summary>({
    queryKey: ["summary-overall"],
    queryFn: () => apiFetch("/api/reimbursements/summary/overall"),
  });

  const expenses = expensesData ?? [];
  const summary = summaryData ?? {
    totalEligible: 0,
    totalReimbursed: 0,
    remaining: 0,
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Expenses Dashboard</h1>
      </header>

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

      <section>
        <h2 className="text-lg font-semibold mb-2">Current Expenses</h2>
        {expenses.length === 0 ? (
          <p>No expenses yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Reimbursed</th>
                <th className="text-right py-2">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-1">
                    <Link
                      href={`/expenses/${e.id}`}
                      className="text-blue-600 underline"
                    >
                      {new Date(e.date_paid).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="py-1 text-right">
                    ${formatCurrency(e.amount)}
                  </td>
                  <td className="py-1">{e.category_name ?? "Uncategorized"}</td>
                  <td className="py-1 text-right">
                    ${formatCurrency(e.total_reimbursed)}
                  </td>
                  <td className="py-1 text-right">
                    ${formatCurrency(e.remaining_to_reimburse)}
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

