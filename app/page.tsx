"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiClient";

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

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch("/api/categories"),
  });

  const { data: summaryData } = useQuery<Summary>({
    queryKey: ["summary-overall"],
    queryFn: () => apiFetch("/api/reimbursements/summary/overall"),
  });

  const [formState, setFormState] = useState({
    amount: "",
    date_paid: "",
    payment_method: "",
    description: "",
    category_id: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const createExpense = useMutation({
    mutationFn: (payload: NewExpensePayload) =>
      apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setFormState({
        amount: "",
        date_paid: "",
        payment_method: "",
        description: "",
        category_id: "",
      });
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError((err as Error).message);
    },
  });

  const archiveExpense = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const unarchiveExpense = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/expenses/${id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: false }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amountNum = Number(formState.amount);
    if (!amountNum || amountNum <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }
    if (!formState.date_paid) {
      setFormError("Date paid is required.");
      return;
    }
    if (!formState.payment_method) {
      setFormError("Payment method is required.");
      return;
    }

    const payload: NewExpensePayload = {
      amount: amountNum,
      date_paid: formState.date_paid,
      payment_method: formState.payment_method,
      description: formState.description || undefined,
      category_id: formState.category_id || undefined,
    };

    createExpense.mutate(payload);
  }

  const expenses = expensesData ?? [];
  const categories = categoriesData ?? [];
  const summary = summaryData ?? {
    totalEligible: 0,
    totalReimbursed: 0,
    remaining: 0,
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link href="/summary" className="text-sm text-blue-600 underline">
          View summary
        </Link>
      </header>

      <section className="border rounded p-4 flex flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-600">Total Eligible</h2>
          <p className="text-xl font-semibold">
            ${summary.totalEligible.toFixed(2)}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-600">Total Reimbursed</h2>
          <p className="text-xl font-semibold text-green-700">
            ${summary.totalReimbursed.toFixed(2)}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-600">Remaining</h2>
          <p className="text-xl font-semibold text-orange-700">
            ${summary.remaining.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Add Expense</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full border px-2 py-1 rounded"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Date Paid</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={formState.date_paid}
              onChange={(e) => setFormState((s) => ({ ...s, date_paid: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Payment Method</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              placeholder="e.g. Credit Card, Debit, Cash"
              value={formState.payment_method}
              onChange={(e) => setFormState((s) => ({ ...s, payment_method: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={formState.category_id}
              onChange={(e) => setFormState((s) => ({ ...s, category_id: e.target.value }))}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              value={formState.description}
              onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={createExpense.isPending}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {createExpense.isPending ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </form>
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
                <th className="text-right py-2">Actions</th>
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
                      {e.date_paid}
                    </Link>
                  </td>
                  <td className="py-1 text-right">${Number(e.amount).toFixed(2)}</td>
                  <td className="py-1">{e.category_name ?? "Uncategorized"}</td>
                  <td className="py-1 text-right">
                    ${Number(e.total_reimbursed).toFixed(2)}
                  </td>
                  <td className="py-1 text-right">
                    ${Number(e.remaining_to_reimburse).toFixed(2)}
                  </td>
                  <td className="py-1 text-right">
                    {e.is_archived ? (
                      <button
                        className="text-xs text-blue-600 underline"
                        onClick={() => unarchiveExpense.mutate(e.id)}
                        disabled={unarchiveExpense.isPending}
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        className="text-xs text-red-600 underline"
                        onClick={() => archiveExpense.mutate(e.id)}
                        disabled={archiveExpense.isPending}
                      >
                        Archive
                      </button>
                    )}
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

