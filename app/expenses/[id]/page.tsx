"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchRaw } from "../../../lib/apiClient";
import { formatCurrency } from "../../../lib/formatCurrency";

type Expense = {
  id: string;
  amount: string;
  date_paid: string;
  description: string | null;
  payment_method: string | null;
  category_name: string | null;
  category_id?: string | null;
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

type Category = {
  id: string;
  name: string;
};

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function getReceiptLabel(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "";
    return last || "View receipt";
  } catch {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1] || "View receipt";
  }
}

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

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch("/api/categories"),
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
  const [previewImage, setPreviewImage] = useState<Image | null>(null);

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
      const raw = (err as Error)?.message ?? "";
      let uiMessage = "Unable to add reimbursement. Please try again.";

      const match = raw.match(/API\s+\d+:\s+(.*)$/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (
            parsed &&
            typeof parsed === "object" &&
            parsed.message === "Reimbursement amount exceeds original expense amount"
          ) {
            uiMessage =
              `Reimbursement cannot exceed the original expense.\n` +
              `Expense amount: $${formatCurrency(parsed.expenseAmount)}\n` +
              `Already reimbursed: $${formatCurrency(parsed.currentTotal)}\n` +
              `Attempted reimbursement: $${formatCurrency(parsed.attemptedAmount)}`;
          } else if (parsed && typeof parsed.message === "string") {
            uiMessage = parsed.message;
          }
        } catch {
          // fall back to default message
        }
      }

      setReimburseError(uiMessage);
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

  const deleteExpenseMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      router.push("/");
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState({
    amount: "",
    date_paid: "",
    payment_method: "",
    description: "",
    category_id: "",
  });

  useEffect(() => {
    if (!expense) return;
    setEditState({
      amount: expense.amount ?? "",
      date_paid: normalizeDateInput(expense.date_paid),
      payment_method: expense.payment_method ?? "",
      description: expense.description ?? "",
      category_id: expense.category_id ?? "",
    });
  }, [expense]);

  const updateExpenseMutation = useMutation({
    mutationFn: async () => {
      const amountNum = Number(editState.amount);
      if (!amountNum || amountNum <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      if (!editState.date_paid) {
        throw new Error("Date is required.");
      }
      if (!editState.payment_method) {
        throw new Error("Payment method is required.");
      }

      return apiFetch(`/api/expenses/${expenseId}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: amountNum,
          date_paid: editState.date_paid,
          payment_method: editState.payment_method,
          description: editState.description || null,
          category_id: editState.category_id || null,
        }),
      });
    },
    onSuccess: () => {
      setIsEditing(false);
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
      <header>
        <h1 className="text-2xl font-semibold">Expense Detail</h1>
      </header>

      <section className="border rounded p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Details</h2>
        </div>

        {isEditing ? (
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateExpenseMutation.mutate();
            }}
          >
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="date"
                className="w-full border px-2 py-1 rounded"
                value={editState.date_paid}
                onChange={(e) =>
                  setEditState((s) => ({ ...s, date_paid: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full border px-2 py-1 rounded"
                value={editState.amount}
                onChange={(e) =>
                  setEditState((s) => ({ ...s, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Payment method</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={editState.payment_method}
                onChange={(e) =>
                  setEditState((s) => ({
                    ...s,
                    payment_method: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select
                className="w-full border px-2 py-1 rounded"
                value={editState.category_id}
                onChange={(e) =>
                  setEditState((s) => ({ ...s, category_id: e.target.value }))
                }
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
                value={editState.description}
                onChange={(e) =>
                  setEditState((s) => ({
                    ...s,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2 flex justify-center gap-5 mt-2">
              <button
                type="button"
                className="btn btn-danger text-xs"
                onClick={() => setIsEditing(false)}
                disabled={updateExpenseMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-wide"
                disabled={updateExpenseMutation.isPending}
              >
                {updateExpenseMutation.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p>
              <span className="font-semibold">Date:</span>{" "}
              {new Date(expense.date_paid).toLocaleDateString()}
            </p>
            <p>
              <span className="font-semibold">Amount:</span> $
              {formatCurrency(amountNum)}
            </p>
            <p>
              <span className="font-semibold">Payment method:</span>{" "}
              {expense.payment_method ?? ""}
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
              {formatCurrency(totalReimbursedNum)}
            </p>
            <p>
              <span className="font-semibold">Remaining to reimburse:</span> $
              {formatCurrency(remainingNum)}
            </p>
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                className="btn btn-primary btn-wide"
                onClick={() => {
                  setEditState({
                    amount: expense.amount ?? "",
                    date_paid: normalizeDateInput(expense.date_paid),
                    payment_method: expense.payment_method ?? "",
                    description: expense.description ?? "",
                    category_id: expense.category_id ?? "",
                  });
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            </div>
          </>
        )}
      </section>

      <section className="border rounded p-4 space-y-3 bg-white">
        <h2 className="text-lg font-semibold">Receipts</h2>
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-3 w-full"
        >
          <div className="self-start">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="btn btn-primary btn-wide disabled:opacity-60 mt-2"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        {images.length === 0 ? (
          <p>No receipts uploaded yet.</p>
        ) : (
          <div className="thumb-grid">
            {images.map((img) => (
              <div key={img.id} className="thumb">
                <button
                  type="button"
                  onClick={() => setPreviewImage(img)}
                  title={getReceiptLabel(img.image_url)}
                  className="border-0 bg-transparent p-0"
                >
                  <img
                    src={img.image_url}
                    alt="Receipt thumbnail"
                    className="thumb-img"
                  />
                </button>
                <button
                  className="btn btn-danger text-xs"
                  onClick={() => deleteImageMutation.mutate(img.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border rounded p-4 space-y-3 bg-white">
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
          <div className="md:col-span-3 flex flex-col items-center gap-2 mt-2">
            {reimburseError && (
              <p className="text-sm text-red-600">{reimburseError}</p>
            )}
            <button
              type="submit"
              disabled={reimburseMutation.isPending}
              className="btn btn-primary btn-wide disabled:opacity-60"
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
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Notes</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reimbursements.map((r) => (
                <tr key={r.id}>
                  <td className="py-1">
                    {r.reimbursed_at
                      ? new Date(r.reimbursed_at).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="py-1 text-right">
                    ${formatCurrency(r.amount)}
                  </td>
                  <td className="py-1">{r.method ?? ""}</td>
                  <td className="py-1">{r.notes ?? ""}</td>
                  <td className="py-1 text-right">
                    <button
                      className="btn btn-danger text-xs"
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

      {previewImage && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="modal-card flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.image_url}
              alt="Receipt"
              className="modal-image"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">
                {getReceiptLabel(previewImage.image_url)}
              </span>
              <button
                type="button"
                className="btn btn-danger text-xs"
                onClick={() => setPreviewImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          disabled={deleteExpenseMutation.isPending}
          className="btn btn-danger mt-4"
          onClick={() => deleteExpenseMutation.mutate()}
        >
          {deleteExpenseMutation.isPending ? "Deleting…" : "Delete expense"}
        </button>
      </div>
    </main>
  );
}


