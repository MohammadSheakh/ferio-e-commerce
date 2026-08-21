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
  const [districts, setDistricts] = useState<
    { id: string; name: string; zoneName?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

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
  const [addressMessage, setAddressMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

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
                (zone.districts || []).map((d: any) => ({
                  ...d,
                  zoneName: zone.name,
                })),
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
          setAccount((prev) =>
            prev
              ? {
                  ...prev,
                  name: nameInput,
                  phoneNumber: phoneInput,
                  profileImageUrl: avatarInput,
                }
              : null,
          );
        }
        setMessage({ text: "Profile updated successfully!", type: "success" });
      } else {
        setMessage({
          text: data.message || "Failed to update profile",
          type: "error",
        });
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
      const url = isEdit
        ? `/api/account/addresses/${editingAddressId}`
        : "/api/account/addresses";
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
        setAddressMessage({
          text: payload.message || "Failed to save address",
          type: "error",
        });
      }
    } catch {
      setAddressMessage({
        text: "Network error saving address.",
        type: "error",
      });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses/${addressId}`, {
        method: "DELETE",
      });
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
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
          Customer Account
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
          My Account
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">
          Please sign in to view and update your personal account details,
          shipping preferences, and order history.
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
    <main className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-6 flex text-xs text-ink2">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-ink">My account</span>
        </nav>

        <section className="mb-10 border-y border-line py-7">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div>
              {account.profileImageUrl ? (
                <img
                  src={account.profileImageUrl}
                  alt={account.name}
                  className="h-20 w-20 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface text-xl font-semibold text-ink">
                  {account.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-semibold tracking-tight text-ink">
                  {account.name}
                </h1>
                {account.isEmailVerified && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    Email verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-ink2">{account.email}</p>
              <p className="mt-1 text-[12px] text-ink2">
                Manage your profile, orders, warranty claims, and delivery
                addresses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href="/account/orders"
                className="rounded-full border border-line px-4 py-2 text-center text-xs font-medium text-ink hover:border-ink"
              >
                My orders
              </Link>
              <Link
                href="/account/warranty"
                className="rounded-full border border-line px-4 py-2 text-center text-xs font-medium text-ink hover:border-ink"
              >
                Warranty claims
              </Link>
              <div className="text-xs text-ink2">
                <CustomerLogoutButton />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-line pb-10">
          <h2 className="mb-6 text-[18px] font-medium text-ink">
            Profile details
          </h2>

          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`mb-6 rounded-card border p-4 text-xs ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-eyebrow text-ink2">
                Profile image URL
              </label>
              <input
                type="url"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                placeholder="Paste a secure image URL"
                className="w-full rounded-card border border-line bg-white px-4 py-3 text-xs focus:border-ink"
              />
              <p className="mt-1 text-[11px] text-ink2">
                Leave blank to use your initials.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-eyebrow text-ink2">
                Full name
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-card border border-line bg-white px-4 py-3 text-xs focus:border-ink"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-eyebrow text-ink2">
                Account email
              </label>
              <input
                type="email"
                disabled
                value={account.email}
                className="w-full cursor-not-allowed rounded-card border border-line bg-surface px-4 py-3 text-xs text-ink2"
              />
              <p className="mt-1 text-[11px] text-ink2">
                Email address is linked to your account login and cannot be
                changed here.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-eyebrow text-ink2">
                Phone number
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
                className="w-full rounded-card border border-line bg-white px-4 py-3 text-xs focus:border-ink"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-ink px-7 py-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving changes…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <section className="pt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[18px] font-medium text-ink">
                Saved delivery addresses
              </h2>
              <p className="mt-1 text-xs text-ink2">
                Select these addresses during checkout without entering them
                again.
              </p>
            </div>
            <button
              onClick={openNewAddressForm}
              className="self-start rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-white hover:opacity-90 sm:self-auto"
            >
              Add address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center">
              <p className="text-sm font-medium text-ink">
                No saved addresses yet
              </p>
              <p className="mt-1 text-xs text-ink2">
                Add an address to make checkout faster.
              </p>
              <button
                onClick={openNewAddressForm}
                className="mt-4 rounded-full border border-line bg-white px-5 py-2 text-xs font-medium text-ink hover:border-ink transition"
              >
                Add address
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`relative rounded-card border p-5 transition-colors ${
                    addr.isDefault
                      ? "border-ink bg-surface"
                      : "border-line bg-white hover:border-ink/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full border border-line bg-white px-3 py-0.5 text-[10px] uppercase tracking-eyebrow text-ink2">
                      {addr.label || "Home"}
                    </span>
                    {addr.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => void handleSetDefaultAddress(addr.id)}
                        className="text-[11px] text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
                      >
                        Set as default
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-medium text-ink">
                    {addr.recipientName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink2">
                    {addr.phoneOriginal}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink2">
                    {addr.detailedAddress}, {addr.area},{" "}
                    <span className="font-medium text-ink">
                      {addr.district}
                    </span>
                  </p>
                  {addr.landmark && (
                    <p className="mt-1 text-[11px] text-ink2">
                      Landmark: {addr.landmark}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-line/60 pt-3 text-xs">
                    <button
                      onClick={() => openEditAddressForm(addr)}
                      className="font-medium text-ink underline decoration-line underline-offset-4"
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

          {showAddressForm && (
            <div className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-base font-medium text-ink">
                  {editingAddressId
                    ? "Edit Delivery Address"
                    : "Add New Delivery Address"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
                >
                  Close
                </button>
              </div>

              {addressMessage && (
                <div
                  role={addressMessage.type === "error" ? "alert" : "status"}
                  className={`mb-4 rounded-card border p-3 text-xs ${
                    addressMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {addressMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Address label
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          label: e.target.value,
                        })
                      }
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Family">Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Recipient full name
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.recipientName}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          recipientName: e.target.value,
                        })
                      }
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Bangladesh mobile number
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="01712345678"
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      District
                    </label>
                    <select
                      required
                      value={addressForm.district}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          district: e.target.value,
                        })
                      }
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
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
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Area / Thana
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.area}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, area: e.target.value })
                      }
                      placeholder="e.g. Dhanmondi, Mirpur, Uttara, Agrabad"
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Detailed address
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={addressForm.detailedAddress}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          detailedAddress: e.target.value,
                        })
                      }
                      placeholder="House, Road, Block, Floor, or Village details"
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2">
                      Landmark (optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.landmark}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          landmark: e.target.value,
                        })
                      }
                      placeholder="Nearby mosque, market, or recognizable place"
                      className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs focus:border-ink"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            isDefault: e.target.checked,
                          })
                        }
                      />
                      Set as default delivery address
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="rounded-full border border-line px-5 py-2 text-xs font-medium text-ink2 hover:border-ink hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="rounded-full bg-ink px-6 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {savingAddress
                      ? "Saving address…"
                      : editingAddressId
                        ? "Update address"
                        : "Save address"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
