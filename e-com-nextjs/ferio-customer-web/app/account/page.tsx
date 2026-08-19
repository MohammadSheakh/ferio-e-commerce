"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerLogoutButton from "@/components/CustomerLogoutButton";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  isEmailVerified: boolean;
}

export interface CustomerAddress {
  id: string;
  label?: string;
  recipientName: string;
  phoneOriginal: string;
  district: string;
  area: string;
  detailedAddress: string;
  landmark?: string;
  isDefault: boolean;
}

export default function AccountPage() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string; zoneName?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Address Modal / Form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    recipientName: "",
    phone: "",
    district: "",
    area: "",
    detailedAddress: "",
    landmark: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [res, distRes] = await Promise.all([
          fetch("/api/account/commerce", { cache: "no-store" }),
          fetch("/api/checkout/delivery-options", { cache: "no-store" }),
        ]);

        if (distRes.ok) {
          const distData = await distRes.json();
          if (Array.isArray(distData.data)) {
            const list = distData.data
              .flatMap((zone: any) =>
                (zone.districts || []).map((d: any) => ({ ...d, zoneName: zone.name })),
              )
              .sort((a: any, b: any) => a.name.localeCompare(b.name));
            setDistricts(list);
          }
        }

        if (res.status === 401) {
          setUnauthorized(true);
        } else if (res.ok) {
          const data = await res.json();
          const acc = data.account || data.data?.account;
          if (acc) {
            setAccount(acc);
            setNameInput(acc.name || "");
            setPhoneInput(acc.phoneNumber || "");
            setAvatarInput(acc.profileImageUrl || "");
          }
          const cust = data.customer || data.data?.customer;
          if (cust?.addresses) {
            setAddresses(cust.addresses);
          }
        }
      } catch {
        // Error fetching profile
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/commerce/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phoneNumber: phoneInput,
          profileImageUrl: avatarInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const updatedAcc = data.account || data.data?.account;
        if (updatedAcc) {
          setAccount(updatedAcc);
          setNameInput(updatedAcc.name || "");
          setPhoneInput(updatedAcc.phoneNumber || "");
          setAvatarInput(updatedAcc.profileImageUrl || "");
        } else {
          setAccount((prev) => prev ? { ...prev, name: nameInput, phoneNumber: phoneInput, profileImageUrl: avatarInput } : null);
        }
        setMessage({ text: "Profile updated successfully!", type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error saving profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openNewAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      recipientName: account?.name || "",
      phone: account?.phoneNumber || "",
      district: districts[0]?.name || "",
      area: "",
      detailedAddress: "",
      landmark: "",
      isDefault: addresses.length === 0,
    });
    setAddressMessage(null);
    setShowAddressForm(true);
  };

  const openEditAddressForm = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || "Home",
      recipientName: addr.recipientName,
      phone: addr.phoneOriginal,
      district: addr.district,
      area: addr.area,
      detailedAddress: addr.detailedAddress,
      landmark: addr.landmark || "",
      isDefault: addr.isDefault,
    });
    setAddressMessage(null);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressMessage(null);

    try {
      const isEdit = Boolean(editingAddressId);
      const url = isEdit ? `/api/account/addresses/${editingAddressId}` : "/api/account/addresses";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      const payload = await res.json();
      if (res.ok) {
        const cust = payload.data?.customer || payload.customer;
        if (cust?.addresses) {
          setAddresses(cust.addresses);
        }
        setShowAddressForm(false);
      } else {
        setAddressMessage({ text: payload.message || "Failed to save address", type: "error" });
      }
    } catch {
      setAddressMessage({ text: "Network error saving address.", type: "error" });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses/${addressId}`, { method: "DELETE" });
      const payload = await res.json();
      if (res.ok) {
        const cust = payload.data?.customer || payload.customer;
        if (cust?.addresses) {
          setAddresses(cust.addresses);
        } else {
          setAddresses((prev) => prev.filter((a) => a.id !== addressId));
        }
      }
    } catch {
      alert("Failed to delete address.");
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${addressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const payload = await res.json();
      if (res.ok) {
        const cust = payload.data?.customer || payload.customer;
        if (cust?.addresses) setAddresses(cust.addresses);
      }
    } catch {
      // error setting default
    }
  };

  const sampleAvatars = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  ];

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-[13px] text-ink2">
        Loading your account profile…
      </main>
    );
  }

  if (unauthorized || !account) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Customer Account</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">My Account</h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">
          Please sign in to view and update your personal account details, shipping preferences, and order history.
        </p>
        <Link
          href="/account/login?next=/account"
          className="mt-7 inline-block rounded-full bg-ink px-6 py-3 text-[13px] text-white"
        >
          Sign in to your account
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 font-sans">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex text-xs text-slate-500">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-ink">My Account</span>
        </nav>

        {/* Profile Card Header */}
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm mb-8">
          <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-stone-900 p-8 text-white">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                {account.profileImageUrl ? (
                  <img
                    src={account.profileImageUrl}
                    alt={account.name}
                    className="h-24 w-24 rounded-full object-cover border-4 border-white/20 shadow-xl"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-2xl border-4 border-white/20 shadow-xl">
                    {account.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-slate-900 bg-emerald-500" title="Active" />
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
                  {account.isEmailVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                      ✓ Verified Account
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300">{account.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Google Auth linked profile · Member of Ferio Platform
                </p>
              </div>

              <div className="flex sm:flex-col gap-2 items-center">
                <Link
                  href="/account/orders"
                  className="w-full rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20 transition text-center"
                >
                  My Orders
                </Link>
                <Link
                  href="/account/warranty"
                  className="w-full rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20 transition text-center"
                >
                  Warranty Claims
                </Link>
                <div className="pt-1 text-xs text-white/80">
                  <CustomerLogoutButton />
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            <h2 className="text-lg font-semibold text-ink mb-6">Edit Profile & Account Picture</h2>

            {message && (
              <div
                className={`mb-6 rounded-2xl p-4 text-xs font-medium ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Picture Selection / Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Profile Picture Avatar
                </label>
                
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  {sampleAvatars.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatarInput(url)}
                      className={`relative rounded-full p-0.5 transition ${
                        avatarInput === url ? "ring-2 ring-blue-600 scale-105" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Avatar option ${idx + 1}`} className="h-12 w-12 rounded-full object-cover" />
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="Or paste image URL (e.g. Google photo URL or custom image link)"
                  className="w-full rounded-2xl border border-line bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-ink focus:bg-white transition"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-2xl border border-line bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-ink focus:bg-white transition"
                />
              </div>

              {/* Email Address (Read Only) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Email Address (Primary Account)
                </label>
                <input
                  type="email"
                  disabled
                  value={account.email}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-500 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Email address is linked to your account login and cannot be changed here.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+880 1XXXXXXXXX"
                  className="w-full rounded-2xl border border-line bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-ink focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-ink px-7 py-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition shadow-sm"
                >
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Saved Delivery Addresses Section */}
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Saved Delivery Addresses</h2>
              <p className="text-xs text-slate-500 mt-1">
                Save multiple addresses for fast 1-click selection during checkout.
              </p>
            </div>
            <button
              onClick={openNewAddressForm}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition shadow-sm self-start sm:self-auto"
            >
              + Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No saved addresses yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your delivery addresses here so you don’t have to type them every time you checkout.</p>
              <button
                onClick={openNewAddressForm}
                className="mt-4 rounded-full border border-line bg-white px-5 py-2 text-xs font-medium text-ink hover:border-ink transition"
              >
                + Add Address Now
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`relative rounded-2xl border p-5 transition ${
                    addr.isDefault
                      ? "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/30"
                      : "border-line bg-slate-50/40 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-slate-200/70 px-3 py-0.5 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                      {addr.label || "Home"}
                    </span>
                    {addr.isDefault ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => void handleSetDefaultAddress(addr.id)}
                        className="text-[11px] text-slate-500 hover:text-ink underline"
                      >
                        Set as default
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-bold text-ink">{addr.recipientName}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{addr.phoneOriginal}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {addr.detailedAddress}, {addr.area}, <span className="font-medium text-slate-700">{addr.district}</span>
                  </p>
                  {addr.landmark && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Landmark: {addr.landmark}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-line/60 pt-3 text-xs">
                    <button
                      onClick={() => openEditAddressForm(addr)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDeleteAddress(addr.id)}
                      className="font-medium text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Address Add / Edit Modal / Form */}
          {showAddressForm && (
            <div className="mt-8 rounded-3xl border border-line bg-slate-50 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
                <h3 className="text-base font-bold text-ink">
                  {editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs text-slate-400 hover:text-ink font-semibold"
                >
                  ✕ Close
                </button>
              </div>

              {addressMessage && (
                <div
                  className={`mb-4 rounded-xl p-3 text-xs font-medium ${
                    addressMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {addressMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Address Label
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Family">Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.recipientName}
                      onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Bangladesh Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="01712345678"
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      District
                    </label>
                    <select
                      required
                      value={addressForm.district}
                      onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} · {d.zoneName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Area / Thana
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.area}
                      onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                      placeholder="e.g. Dhanmondi, Mirpur, Uttara, Agrabad"
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Detailed Address
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={addressForm.detailedAddress}
                      onChange={(e) => setAddressForm({ ...addressForm, detailedAddress: e.target.value })}
                      placeholder="House, Road, Block, Floor, or Village details"
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.landmark}
                      onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                      placeholder="Nearby mosque, market, or recognizable place"
                      className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs outline-none focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      />
                      Set as default delivery address
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="rounded-full border border-line px-5 py-2 text-xs font-medium text-slate-600 hover:border-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="rounded-full bg-ink px-6 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {savingAddress ? "Saving Address..." : editingAddressId ? "Update Address" : "Save New Address"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
