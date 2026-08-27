"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import CopyableId from "@/components/CopyableId";
import RiderLocationMapModal from "./RiderLocationMapModal";

type DeliveryPersonnel = {
  id: string;
  name: string;
  phoneOriginal: string;
  phoneNormalized: string;
  email: string | null;
  nidNumber: string | null;
  vehicleType: "BIKE" | "BICYCLE" | "E_BIKE" | "BUS" | "CUSTOM" | "WALK";
  operatingZone: string | null;
  drivingLicense: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
  currentLat: number | null;
  currentLng: number | null;
  lastLocationAt: string | null;
  createdAt: string;
  user?: { id: string; email: string; profileImageUrl: string } | null;
  _count?: { assignedOrders: number };
};

type CreateForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
  nidNumber: string;
  vehicleType: "BIKE" | "BICYCLE" | "E_BIKE" | "BUS" | "CUSTOM" | "WALK";
  operatingZone: string;
  emergencyPhone: string;
};

type EditForm = {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string; // Leave blank to keep unchanged
  nidNumber: string;
  vehicleType: "BIKE" | "BICYCLE" | "E_BIKE" | "BUS" | "CUSTOM" | "WALK";
  operatingZone: string;
  emergencyPhone: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
};

const emptyForm: CreateForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  nidNumber: "",
  vehicleType: "BIKE",
  operatingZone: "Dhaka Metro",
  emergencyPhone: "",
};

export default function DeliveryMenPage() {
  const [personnel, setPersonnel] = useState<DeliveryPersonnel[]>([]);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PENDING" | "ALL">(
    "PENDING",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mapModalRider, setMapModalRider] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm);

  const [editingForm, setEditingForm] = useState<EditForm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [initialPassword, setInitialPassword] = useState("RiderPass123!");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/delivery-personnel", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: { items: DeliveryPersonnel[]; total: number };
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message || "Unable to load delivery personnel.",
        );
      }
      setPersonnel(payload.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/delivery-personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Unable to create rider account.");
      }
      setSuccessMsg(`Created active rider account for ${form.name}.`);
      setShowCreateModal(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingForm) return;

    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/delivery-personnel/${editingForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingForm.name,
          phone: editingForm.phone,
          email: editingForm.email || undefined,
          password: editingForm.password.trim() || undefined,
          nidNumber: editingForm.nidNumber || undefined,
          vehicleType: editingForm.vehicleType,
          operatingZone: editingForm.operatingZone || undefined,
          emergencyPhone: editingForm.emergencyPhone || undefined,
          status: editingForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update rider profile.");
      }

      setSuccessMsg(
        editingForm.password.trim()
          ? `Updated profile and reset password for ${editingForm.name}.`
          : `Updated rider profile for ${editingForm.name}.`,
      );
      setEditingForm(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async (
    id: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/delivery-personnel/${id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          initialPassword: status === "APPROVED" ? initialPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Approval update failed.");
      }
      setSuccessMsg(
        status === "APPROVED"
          ? "Rider application approved and user account created."
          : "Rider application rejected.",
      );
      setApprovingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (p: DeliveryPersonnel) => {
    setEditingForm({
      id: p.id,
      name: p.name,
      phone: p.phoneOriginal,
      email: p.email || "",
      password: "",
      nidNumber: p.nidNumber || "",
      vehicleType: p.vehicleType,
      operatingZone: p.operatingZone || "",
      emergencyPhone: p.emergencyPhone || "",
      status: p.status,
    });
  };

  const pendingList = personnel.filter((p) => p.status === "PENDING_APPROVAL");
  const activeList = personnel.filter((p) => p.status === "APPROVED");
  const currentList =
    activeTab === "PENDING"
      ? pendingList
      : activeTab === "ACTIVE"
        ? activeList
        : personnel;

  const vehicleLabel = (type: string) => {
    switch (type) {
      case "BIKE":
        return "Motorcycle";
      case "BICYCLE":
        return "Bicycle";
      case "E_BIKE":
        return "E-Bike";
      case "BUS":
        return "Bus Delivery";
      case "CUSTOM":
        return "Custom Vehicle";
      case "WALK":
        return "Walking";
      default:
        return type;
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] focus:border-ink";

  return (
    <>
      <Topbar
        title="Delivery personnel"
        subtitle="Review applications, accounts, status, and location evidence"
      />

      <div className="space-y-6 p-4 xl:p-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border-y border-line p-5">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Active riders
            </p>
            <p className="mt-2 text-[26px] font-semibold text-ink">
              {activeList.length}
            </p>
          </div>
          <div className="border-y border-line p-5">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Pending applications
            </p>
            <p className="mt-2 text-[26px] font-semibold text-ink">
              {pendingList.length}
            </p>
          </div>
          <div className="border-y border-line p-5">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Total registered
            </p>
            <p className="mt-2 text-[26px] font-semibold text-ink">
              {personnel.length}
            </p>
          </div>
        </div>

        {/* Action & Filter Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 border-b border-line pb-1">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition ${
                activeTab === "PENDING"
                  ? "border-ink text-ink font-semibold"
                  : "border-transparent text-ink2 hover:text-ink"
              }`}
            >
              Pending Applications ({pendingList.length})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition ${
                activeTab === "ACTIVE"
                  ? "border-ink text-ink font-semibold"
                  : "border-transparent text-ink2 hover:text-ink"
              }`}
            >
              Active Riders ({activeList.length})
            </button>
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition ${
                activeTab === "ALL"
                  ? "border-ink text-ink font-semibold"
                  : "border-transparent text-ink2 hover:text-ink"
              }`}
            >
              All Records ({personnel.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/delivery-map"
              className="rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface transition inline-flex items-center gap-1.5"
            >
              Live fleet map
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 transition"
            >
              Add rider account
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-700"
          >
            {successMsg}
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto border-y border-line bg-paper">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="w-24 px-4 py-3 font-normal">ID</th>
                <th className="px-4 py-3 font-normal">Applicant</th>
                <th className="px-4 py-3 font-normal">Contact & NID</th>
                <th className="px-4 py-3 font-normal">Vehicle & Zone</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">GPS Location</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13px]">
              {currentList.map((p) => (
                <tr key={p.id}>
                  <td className="w-24 px-4 py-3.5 align-top">
                    <CopyableId id={p.id} />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink2">
                      Applied: {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 align-top space-y-0.5">
                    <p className="text-ink text-[12px]">{p.phoneOriginal}</p>
                    {p.email && (
                      <p className="text-[11px] text-ink2">{p.email}</p>
                    )}
                    {p.nidNumber && (
                      <p className="text-[11px] text-ink2">
                        NID: {p.nidNumber}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top space-y-0.5">
                    <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] text-ink border border-line">
                      {vehicleLabel(p.vehicleType)}
                    </span>
                    <p className="text-[12px] text-ink2">
                      {p.operatingZone || "Unassigned"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${
                        p.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "PENDING_APPROVAL"
                            ? "bg-surface text-ink2"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {p.status === "PENDING_APPROVAL"
                        ? "Pending"
                        : p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top text-[12px] text-ink2">
                    {p.currentLat !== null && p.currentLng !== null ? (
                      <div>
                        <p className="text-[11px] font-mono">
                          {p.currentLat.toFixed(4)}, {p.currentLng.toFixed(4)}
                        </p>
                        <button
                          onClick={() =>
                            setMapModalRider({ id: p.id, name: p.name })
                          }
                          className="mt-0.5 text-[11px] font-medium text-ink underline decoration-line underline-offset-4"
                        >
                          View map and route
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setMapModalRider({ id: p.id, name: p.name })
                        }
                        className="text-[11px] text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
                      >
                        View map
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right space-x-2">
                    {p.status === "PENDING_APPROVAL" && (
                      <>
                        <button
                          onClick={() => setApprovingId(p.id)}
                          className="rounded-full bg-emerald-700 px-3 py-1 text-[12px] font-medium text-white hover:bg-emerald-800 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(p.id, "REJECTED")}
                          disabled={submitting}
                          className="rounded-full border border-line px-3 py-1 text-[12px] text-rose-700 hover:bg-rose-50 transition"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => openEditModal(p)}
                      className="rounded-full border border-line px-3 py-1 text-[12px] text-ink hover:bg-surface transition"
                    >
                      Edit info
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && currentList.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-[13px] text-ink2"
                  >
                    No records found for the selected tab.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-[13px] text-ink2"
                  >
                    Loading delivery personnel…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rider Modal */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <form
            onSubmit={handleEditSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-rider-dialog-title"
            className="my-8 w-full max-w-lg space-y-4 rounded-card border border-line bg-paper p-6"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3
                  id="edit-rider-dialog-title"
                  className="text-[16px] font-medium text-ink"
                >
                  Edit rider profile
                </h3>
                <p className="text-[12px] text-ink2">
                  Update profile information and reset login password
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingForm(null)}
                className="text-ink2 hover:text-ink text-[16px]"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Rider Full Name *
                <input
                  required
                  value={editingForm.name}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, name: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Phone Number *
                <input
                  required
                  value={editingForm.phone}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, phone: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Email Address
                <input
                  type="email"
                  value={editingForm.email}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, email: e.target.value })
                  }
                  placeholder="rider@example.com"
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Reset Password (Optional)
                <input
                  type="password"
                  value={editingForm.password}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, password: e.target.value })
                  }
                  placeholder="Leave blank to keep current"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Vehicle Type
                <select
                  value={editingForm.vehicleType}
                  onChange={(e) =>
                    setEditingForm({
                      ...editingForm,
                      vehicleType: e.target.value as any,
                    })
                  }
                  className={inputClass}
                >
                  <option value="BIKE">Motorcycle</option>
                  <option value="BICYCLE">Bicycle</option>
                  <option value="E_BIKE">E-Bike</option>
                  <option value="BUS">Bus Delivery</option>
                  <option value="CUSTOM">Custom Vehicle</option>
                  <option value="WALK">Walking</option>
                </select>
              </label>
              <label className="block text-[12px] text-ink2">
                Operating Zone
                <input
                  value={editingForm.operatingZone}
                  onChange={(e) =>
                    setEditingForm({
                      ...editingForm,
                      operatingZone: e.target.value,
                    })
                  }
                  placeholder="e.g. Dhaka Metro"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                NID Number
                <input
                  value={editingForm.nidNumber}
                  onChange={(e) =>
                    setEditingForm({
                      ...editingForm,
                      nidNumber: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Emergency Phone
                <input
                  value={editingForm.emergencyPhone}
                  onChange={(e) =>
                    setEditingForm({
                      ...editingForm,
                      emergencyPhone: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingForm(null)}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approve Modal */}
      {approvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-rider-dialog-title"
            className="w-full max-w-md space-y-4 rounded-card border border-line bg-paper p-6"
          >
            <h3
              id="approve-rider-dialog-title"
              className="text-[16px] font-medium text-ink"
            >
              Approve rider application
            </h3>
            <p className="text-[13px] text-ink2">
              Approving will create an active login account for this rider.
            </p>
            <label className="block text-[12px] text-ink2">
              Initial Login Password
              <input
                type="text"
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingId(null)}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApprovalAction(approvingId, "APPROVED")}
                disabled={submitting}
                className="rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? "Approving…" : "Confirm approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Add Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <form
            onSubmit={handleCreateSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-rider-dialog-title"
            className="my-8 w-full max-w-lg space-y-4 rounded-card border border-line bg-paper p-6"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3
                id="create-rider-dialog-title"
                className="text-[16px] font-medium text-ink"
              >
                Add rider account
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink2 hover:text-ink text-[16px]"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Rider Full Name *
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full Name"
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Phone Number *
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Email Address *
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="rider@example.com"
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Login Password *
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Password"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                Vehicle Type
                <select
                  value={form.vehicleType}
                  onChange={(e) =>
                    setForm({ ...form, vehicleType: e.target.value as any })
                  }
                  className={inputClass}
                >
                  <option value="BIKE">Motorcycle</option>
                  <option value="BICYCLE">Bicycle</option>
                  <option value="E_BIKE">E-Bike</option>
                  <option value="BUS">Bus Delivery</option>
                  <option value="CUSTOM">Custom Vehicle</option>
                  <option value="WALK">Walking</option>
                </select>
              </label>
              <label className="block text-[12px] text-ink2">
                Operating Zone
                <input
                  value={form.operatingZone}
                  onChange={(e) =>
                    setForm({ ...form, operatingZone: e.target.value })
                  }
                  placeholder="e.g. Dhaka Metro"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-ink2">
                NID Number
                <input
                  value={form.nidNumber}
                  onChange={(e) =>
                    setForm({ ...form, nidNumber: e.target.value })
                  }
                  placeholder="National ID"
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] text-ink2">
                Emergency Phone
                <input
                  value={form.emergencyPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyPhone: e.target.value })
                  }
                  placeholder="Emergency contact"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mapModalRider && (
        <RiderLocationMapModal
          riderId={mapModalRider.id}
          riderName={mapModalRider.name}
          onClose={() => setMapModalRider(null)}
        />
      )}
    </>
  );
}
