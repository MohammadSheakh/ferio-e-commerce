"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatTaka } from "@/lib/catalog";

type RiderProfile = {
  id: string;
  name: string;
  phoneOriginal: string;
  email?: string;
  vehicleType: string;
  operatingZone?: string;
  status: string;
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: string;
};

type AssignedOrder = {
  id: string;
  reference: string;
  status: string;
  shipmentStatus: string;
  paymentStatus: string;
  total: number;
  customer?: { id: string; name: string; phoneOriginal: string };
  address?: {
    recipientName: string;
    phoneOriginal: string;
    district: string;
    area: string;
    detailedAddress: string;
    landmark?: string;
  };
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
  createdAt: string;
};

const vehicleIcons: Record<string, string> = {
  BIKE: "🏍️ Motorbike",
  BICYCLE: "🚲 Bicycle",
  E_BIKE: "⚡ E-Bike",
  BUS: "🚌 Bus",
  CUSTOM: "🚐 Custom Vehicle",
  WALK: "🏃 Walking",
};

export default function RiderPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  useEffect(() => {
    // Session lives in an httpOnly cookie managed by the BFF routes.
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch("/api/delivery/me");
        if (!cancelled && res.ok) {
          setToken("cookie-session");
        }
      } catch {
        // Not signed in
      }
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/delivery/me");
      if (res.ok) {
        const raw = await res.json();
        const prof = raw.data || raw;
        setProfile({
          id: prof.id,
          name: prof.name || prof.user?.name || "Rider Account",
          phoneOriginal: prof.phoneOriginal || prof.phoneNormalized || prof.user?.phoneNumber || prof.email || "Registered",
          email: prof.email || prof.user?.email || "",
          vehicleType: prof.vehicleType || "BIKE",
          operatingZone: prof.operatingZone || "Dhaka North",
          status: prof.status || "APPROVED",
        });
      }
    } catch {
      // Fallback
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/delivery/my-orders`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOrders(data);
      } else if (res.ok && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error("Failed to load assigned orders", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadProfile();
      void loadOrders();
    }
  }, [token, loadProfile, loadOrders]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/delivery/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Rider login failed. Check credentials.");
      }
      setToken("cookie-session");
      if (data.user) {
        setProfile(data.user);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleToggleOnlineStatus = async () => {
    if (!token) return;
    const targetState = !isOnline;
    setTogglingOnline(true);
    try {
      const res = await fetch("/api/delivery/online-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: targetState }),
      });
      if (res.ok) {
        setIsOnline(targetState);
      } else {
        setGeoStatus("Could not change duty status. Try again.");
      }
    } catch {
      setGeoStatus("Network error changing duty status.");
    } finally {
      setTogglingOnline(false);
    }
  };

  const fetchLocationCoordinates = (): Promise<{ latitude: number; longitude: number; source: string }> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        fetch("https://ipapi.co/json/")
          .then((res) => res.json())
          .then((data) => {
            if (typeof data.latitude === "number" && typeof data.longitude === "number") {
              resolve({ latitude: data.latitude, longitude: data.longitude, source: "IP Network" });
            } else {
              throw new Error("No IP coords");
            }
          })
          .catch(() => {
            resolve({ latitude: 23.8103, longitude: 90.4125, source: "Default Coords" });
          });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            source: "Hardware GPS",
          });
        },
        () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                source: "Cell / Wi-Fi Network",
              });
            },
            () => {
              fetch("https://ipapi.co/json/")
                .then((res) => res.json())
                .then((data) => {
                  if (typeof data.latitude === "number" && typeof data.longitude === "number") {
                    resolve({ latitude: data.latitude, longitude: data.longitude, source: "IP Network" });
                  } else {
                    throw new Error("No IP coords");
                  }
                })
                .catch(() => {
                  resolve({ latitude: 23.8103, longitude: 90.4125, source: "Default Coords" });
                });
            },
            { enableHighAccuracy: false, timeout: 8000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!token) return;
    setUpdatingId(orderId);
    try {
      const coords = await fetchLocationCoordinates();

      const res = await fetch(`/api/delivery/my-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      if (res.ok) {
        setGeoStatus(`Status updated (${status}) & Location saved (${coords.source})`);
        await loadOrders();
      } else {
        alert("Unable to update delivery status.");
      }
    } catch {
      alert("Error updating order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePingLocation = async () => {
    if (!token) return;
    setGeoStatus("Locating rider via GPS / Cellular Network...");
    const coords = await fetchLocationCoordinates();
    try {
      const res = await fetch(`/api/delivery/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
      });
      if (res.ok) {
        setGeoStatus(`Location Recorded (${coords.source}): ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      } else {
        setGeoStatus("Failed to send location update.");
      }
    } catch {
      setGeoStatus("Network error sending location.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/delivery/logout", { method: "POST" });
    } catch {
      // Cookie clearing is best-effort client-side
    }
    setToken(null);
    setProfile(null);
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Rider Portal</p>
          <h1 className="mt-2 text-[24px] font-semibold text-ink">Sign In</h1>
          <p className="text-[13px] text-ink2 mt-1">
            Log in with your approved delivery account credentials.
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-card border border-line bg-paper p-6 space-y-4">
          {loginError && (
            <div className="rounded-card border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-[12px] text-ink2">Rider Email or Phone Number</label>
            <input
              required
              type="text"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="017xxxxxxxx or rider@example.com"
              className="mt-1.5 w-full rounded-card border border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block text-[12px] text-ink2">Password</label>
            <input
              required
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-card border border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-full bg-ink py-3 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loggingIn ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8 space-y-6">
      {/* Logged-in Rider Profile & Status Header */}
      <div className="rounded-card border border-line bg-paper p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                  }`}
                />
                {isOnline ? "ONLINE (Active Duty)" : "OFFLINE (Duty Off)"}
              </span>
            </div>
            <h1 className="text-[20px] font-bold text-ink">{profile?.name || "Delivery Rider"}</h1>
            <p className="text-[13px] text-ink2">
              📞 {profile?.phoneOriginal || "Phone registered"}
              {profile?.operatingZone ? ` · 📍 ${profile.operatingZone}` : ""}
            </p>
            {profile?.vehicleType && (
              <p className="text-[12px] text-ink2">
                Vehicle: <span className="font-medium text-ink">{vehicleIcons[profile.vehicleType] || profile.vehicleType}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-line px-3.5 py-1.5 text-[12px] text-ink2 hover:text-ink hover:border-ink transition"
          >
            Sign Out
          </button>
        </div>

        {/* Online / Offline Duty Switch Controls */}
        <div className="pt-3 border-t border-line flex items-center justify-between">
          <div className="text-[12px] text-ink2">
            Duty Mode Status:{" "}
            <span className={`font-semibold ${isOnline ? "text-emerald-700" : "text-neutral-600"}`}>
              {isOnline ? "Receiving Deliveries" : "Off-Duty"}
            </span>
          </div>

          <button
            onClick={handleToggleOnlineStatus}
            disabled={togglingOnline}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition shadow-sm ${
              isOnline
                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {togglingOnline
              ? "Updating..."
              : isOnline
              ? "Go Offline 🔴"
              : "Go Online 🟢"}
          </button>
        </div>
      </div>

      {/* Geolocation Ping Bar */}
      <div className="rounded-card border border-line bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] text-ink font-semibold">GPS Location Update</span>
            <p className="text-[11px] text-ink2">Send location update to admin dashboard map</p>
          </div>
          <button
            onClick={handlePingLocation}
            className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-white hover:opacity-90 transition"
          >
            Ping Location
          </button>
        </div>
        {geoStatus && <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg">{geoStatus}</p>}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h2 className="text-[15px] font-bold text-ink px-1">
          Assigned Deliveries ({orders.length})
        </h2>

        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-card border border-line bg-paper p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <p className="text-[11px] text-ink2">Ref: #{o.reference}</p>
                <p className="text-[14px] font-semibold text-ink">
                  {o.address?.recipientName || o.customer?.name || "Customer"}
                </p>
              </div>
              <span className="rounded-full bg-surface border border-line px-2.5 py-0.5 text-[11px] font-medium text-ink">
                {o.shipmentStatus}
              </span>
            </div>

            <div className="space-y-1 text-[13px]">
              <p className="text-ink">
                Phone:{" "}
                <a
                  href={`tel:${o.address?.phoneOriginal || o.customer?.phoneOriginal}`}
                  className="text-ink font-medium underline underline-offset-4"
                >
                  {o.address?.phoneOriginal || o.customer?.phoneOriginal}
                </a>
              </p>
              <p className="text-ink2 leading-relaxed">
                Address: {o.address?.detailedAddress}, {o.address?.area}, {o.address?.district}
              </p>
              {o.address?.landmark && (
                <p className="text-[12px] text-ink2">Landmark: {o.address.landmark}</p>
              )}
            </div>

            <div className="rounded-card bg-surface p-3 flex items-center justify-between text-[13px]">
              <div>
                <p className="text-[11px] text-ink2 uppercase tracking-eyebrow">Amount to Collect</p>
                <p className="text-[16px] font-semibold text-ink">{formatTaka(o.total)}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  o.paymentStatus === "PAID"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {o.paymentStatus}
              </span>
            </div>

            {/* Rider Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStatus(o.id, "PICKED_UP")}
                disabled={updatingId === o.id}
                className="rounded-full border border-line bg-paper py-2 text-[12px] font-medium text-ink hover:bg-surface"
              >
                Picked Up
              </button>
              <button
                onClick={() => handleUpdateStatus(o.id, "OUT_FOR_DELIVERY")}
                disabled={updatingId === o.id}
                className="rounded-full border border-line bg-paper py-2 text-[12px] font-medium text-ink hover:bg-surface"
              >
                On the Way
              </button>
              <button
                onClick={() => handleUpdateStatus(o.id, "DELIVERED")}
                disabled={updatingId === o.id}
                className="col-span-2 rounded-full bg-emerald-700 py-2.5 text-[13px] font-medium text-white hover:bg-emerald-800"
              >
                Mark as Delivered
              </button>
            </div>
          </div>
        ))}

        {!loadingOrders && orders.length === 0 && (
          <div className="rounded-card border border-line bg-paper p-8 text-center text-[13px] text-ink2">
            No active deliveries currently assigned to you.
          </div>
        )}

        {loadingOrders && (
          <div className="rounded-card border border-line bg-paper p-8 text-center text-[13px] text-ink2">
            Loading assigned deliveries...
          </div>
        )}
      </div>
    </main>
  );
}
