"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiClient";
import { formatCurrency } from "../lib/formatCurrency";
import { auth } from "../lib/firebaseClient";

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
  const currentUser = auth.currentUser;
  const firstName =
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "there";

  const {
    data: expensesData,
    isLoading,
    error,
  } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => apiFetch("/api/expenses?status=active"),
  });

  const expenses = expensesData ?? [];
  const summary = expenses.reduce(
    (acc, e) => {
      const amount = Number(e.amount) || 0;
      const reimbursed = Number(e.total_reimbursed) || 0;
      acc.totalEligible += amount;
      acc.totalReimbursed += reimbursed;
      return acc;
    },
    { totalEligible: 0, totalReimbursed: 0, remaining: 0 }
  );
  summary.remaining = summary.totalEligible - summary.totalReimbursed;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl card-title">Welcome, {firstName}</h1>
      </header>

      <section className="metric-row">
        <div className="metric-card">
          <div className="metric-value">
            ${formatCurrency(summary.totalEligible)}
          </div>
          <div className="metric-label">Total eligible</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            ${formatCurrency(summary.totalReimbursed)}
          </div>
          <div className="metric-label">Total reimbursed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            ${formatCurrency(summary.remaining)}
          </div>
          <div className="metric-label">Remaining</div>
        </div>
      </section>

      <section className="rounded p-4 space-y-3 bg-white shadow-soft section-card">
        <h2 className="text-lg card-title">Current Expenses</h2>
        {expenses.length === 0 ? (
          <p>No expenses yet.</p>
        ) : (
          <table className="table table-striped table-style-1">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-right">Amount</th>
                <th className="text-left">Category</th>
                <th className="text-right">Reimbursed</th>
                <th className="text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link
                      href={`/expenses/${e.id}`}
                      className="text-blue-600 underline"
                    >
                      {new Date(e.date_paid).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="text-right">
                    ${formatCurrency(e.amount)}
                  </td>
                  <td>{e.category_name ?? "Uncategorized"}</td>
                  <td className="text-right">
                    ${formatCurrency(e.total_reimbursed)}
                  </td>
                  <td className="text-right">
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

