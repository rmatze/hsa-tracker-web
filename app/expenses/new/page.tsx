"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/apiClient";

type Category = {
  id: string;
  name: string;
};

type NewExpensePayload = {
  amount: number;
  date_paid: string;
  payment_method: string;
  description?: string;
  category_id?: string | null;
};

export default function NewExpensePage() {
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch("/api/categories"),
  });

  const [formState, setFormState] = useState({
    amount: "",
    date_paid: "",
    payment_method: "",
    description: "",
    category_id: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage("Expense added.");
    },
    onError: (err: unknown) => {
      setSuccessMessage(null);
      setFormError((err as Error).message);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

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

  const categories = categoriesData ?? [];

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Add expense</h1>
        <p className="text-sm text-gray-600">
          Capture a new out-of-pocket medical expense to reimburse later.
        </p>
      </header>

      <section className="border rounded p-4 space-y-3 bg-white">
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
            <label className="block text-sm mb-1">Date paid out-of-pocket</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={formState.date_paid}
              onChange={(e) => setFormState((s) => ({ ...s, date_paid: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Payment method</label>
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
          <div className="md:col-span-2 flex flex-col items-center gap-2 mt-2">
            <div className="space-y-1 text-center">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              {successMessage && (
                <p className="text-sm text-green-700">{successMessage}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={createExpense.isPending}
              className="btn btn-primary btn-wide disabled:opacity-60"
            >
              {createExpense.isPending ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}


