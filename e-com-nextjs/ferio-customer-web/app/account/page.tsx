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

export default function AccountPage() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
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
        }
      } catch {
        // Error fetching profile
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
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
        setMessage({ text: "Profile and picture updated successfully!", type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error saving profile. Please try again.", type: "error" });
    } finally {
      setSaving(false);
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
      </div>
    </div>
  );
}
