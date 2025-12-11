"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchRaw } from "../../../lib/apiClient";

type Expense = {
  id: string;
  amount: string;
  date_paid: string;
  description: string | null;
  payment_method: string | null;
  category_name: string | null;
  total_reimbursed: string;
  remaining_to_reimburse: string;
};

type Image = {
  id: string;
  image_url: string;
  mime_type: string;
  created_at: string;
};

type Reimbursement = {
  id: string;
  amount: string;
  reimbursed_at: string;
  method: string | null;
  notes: string | null;
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const expenseId = params.id as string;

  const {
    data: expense,
    isLoading: expenseLoading,
    error: expenseError,
  } = useQuery<Expense>({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      const list = await apiFetch<Expense[]>("/api/expenses?status=all");
      const exp = list.find((e) => e.id === expenseId);
      if (!exp) {
        throw new Error("Expense not found");
      }
      return exp;
    },
  });

  const { data: images = [] } = useQuery<Image[]>({
    queryKey: ["images", expenseId],
    queryFn: () => apiFetch(`/api/images/${expenseId}`),
  });

  const { data: reimbursements = [] } = useQuery<Reimbursement[]>({
    queryKey: ["reimbursements", expenseId],
    queryFn: () => apiFetch(`/api/reimbursements/${expenseId}`),
  });

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expenseId", expenseId);

      const res = await apiFetchRaw("/api/upload", {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    onSuccess: () => {
      setFile(null);
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["images", expenseId] });
    },
    onError: (err: unknown) => {
      setUploadError((err as Error).message);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) =>
      apiFetch(`/api/images/${imageId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images", expenseId] });
    },
  });

  const [reimburseForm, setReimburseForm] = useState({
    amount: "",
    method: "",
    notes: "",
  });
  const [reimburseError, setReimburseError] = useState<string | null>(null);

  const reimburseMutation = useMutation({
    mutationFn: async () => {
      const amountNum = Number(reimburseForm.amount);
      if (!amountNum || amountNum <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      return apiFetch("/api/reimbursements", {
        method: "POST",
        body: JSON.stringify({
          expense_id: expenseId,
          amount: amountNum,
          method: reimburseForm.method || undefined,
          notes: reimburseForm.notes || undefined,
        }),
      });
    },
    onSuccess: () => {
      setReimburseForm({ amount: "", method: "", notes: "" });
      setReimburseError(null);
      queryClient.invalidateQueries({ queryKey: ["reimbursements", expenseId] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    },
    onError: (err: unknown) => {
      setReimburseError((err as Error).message);
    },
  });

  const deleteReimbursementMutation = useMutation({
    mutationFn: (reimbursementId: string) =>
      apiFetch(`/api/reimbursements/${reimbursementId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reimbursements", expenseId] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    },
  });

  function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);
    uploadMutation.mutate();
  }

  function handleReimburseSubmit(e: FormEvent) {
    e.preventDefault();
    setReimburseError(null);
    reimburseMutation.mutate();
  }

  if (expenseLoading) return <div className="p-6">Loading expense…</div>;
  if (expenseError || !expense)
    return (
      <div className="p-6 text-red-600">
        {(expenseError as Error | null)?.message || "Expense not found"}
      </div>
    );

  const amountNum = Number(expense.amount) || 0;
  const totalReimbursedNum = Number(expense.total_reimbursed) || 0;
  const remainingNum = Number(expense.remaining_to_reimburse) || 0;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        className="text-sm text-blue-600 underline"
        onClick={() => router.push("/")}
      >
        ← Back to expenses
      </button>

      <section className="border rounded p-4 space-y-2">
        <h1 className="text-2xl font-semibold">Expense Detail</h1>
        <p>
          <span className="font-semibold">Date:</span> {expense.date_paid}
        </p>
        <p>
          <span className="font-semibold">Amount:</span> $
          {amountNum.toFixed(2)}
        </p>
        <p>
          <span className="font-semibold">Category:</span>{" "}
          {expense.category_name ?? "Uncategorized"}
        </p>
        {expense.description && (
          <p>
            <span className="font-semibold">Description:</span>{" "}
            {expense.description}
          </p>
        )}
        <p>
          <span className="font-semibold">Total reimbursed:</span> $
          {totalReimbursedNum.toFixed(2)}
        </p>
        <p>
          <span className="font-semibold">Remaining to reimburse:</span> $
          {remainingNum.toFixed(2)}
        </p>
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Receipts</h2>
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-3 items-start">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </button>
        </form>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        {images.length === 0 ? (
          <p>No receipts uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {images.map((img) => (
              <li key={img.id} className="flex items-center justify-between">
                <a
                  href={img.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline text-sm break-all"
                >
                  {img.image_url}
                </a>
                <button
                  className="text-xs text-red-600 underline"
                  onClick={() => deleteImageMutation.mutate(img.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Reimbursements</h2>

        <form
          onSubmit={handleReimburseSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div>
            <label className="block text-sm mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full border px-2 py-1 rounded"
              value={reimburseForm.amount}
              onChange={(e) =>
                setReimburseForm((s) => ({ ...s, amount: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Method</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              placeholder="e.g. Fidelity HSA"
              value={reimburseForm.method}
              onChange={(e) =>
                setReimburseForm((s) => ({ ...s, method: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Notes</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              value={reimburseForm.notes}
              onChange={(e) =>
                setReimburseForm((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            {reimburseError && (
              <p className="text-sm text-red-600">{reimburseError}</p>
            )}
            <button
              type="submit"
              disabled={reimburseMutation.isPending}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {reimburseMutation.isPending ? "Saving…" : "Add Reimbursement"}
            </button>
          </div>
        </form>

        {reimbursements.length === 0 ? (
          <p>No reimbursements yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Notes</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reimbursements.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-1">
                    {r.reimbursed_at
                      ? new Date(r.reimbursed_at).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="py-1 text-right">
                    ${Number(r.amount).toFixed(2)}
                  </td>
                  <td className="py-1">{r.method ?? ""}</td>
                  <td className="py-1">{r.notes ?? ""}</td>
                  <td className="py-1 text-right">
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => deleteReimbursementMutation.mutate(r.id)}
                    >
                      Delete
                    </button>
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


