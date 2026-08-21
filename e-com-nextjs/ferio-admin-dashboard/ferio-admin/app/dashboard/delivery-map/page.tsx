"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";

type LocationHistoryItem = {
  id: string;
  latitude: number;
  longitude: number;
  sequence: number;
  createdAt: string;
};

type RiderMapItem = {
  id: string;
  name: string;
  phoneOriginal: string;
  vehicleType: string;
  operatingZone: string | null;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationAt: string | null;
  locationHistory: LocationHistoryItem[];
};

type OrderMapItem = {
  id: string;
  reference: string;
  status: string;
  shipmentStatus: string;
  total: number;
  assignedDeliveryPersonnelId: string | null;
  address?: {
    recipientName: string;
    phoneOriginal: string;
    district: string;
    area: string;
    detailedAddress: string;
    landmark?: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

const RIDER_COLORS = [
  "#e11d48", // Rose / Red
  "#059669", // Emerald / Green
  "#2563eb", // Blue
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#0891b2", // Cyan
  "#db2777", // Pink
  "#4f46e5", // Indigo
];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function DeliveryMapPage() {
  const [riders, setRiders] = useState<RiderMapItem[]>([]);
  const [orders, setOrders] = useState<OrderMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const loadData = useCallback(async (showInitialLoading = true) => {
    if (showInitialLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/delivery-personnel/map-data", {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || "Failed to load map data.");
      }
      setRiders(payload.data.riders || []);
      setOrders(payload.data.activeOrders || []);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data.");
    } finally {
      if (showInitialLoading) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => void loadData(false), 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadData]);

  // Dynamically load Leaflet JS & CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existingCss = document.getElementById("leaflet-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeafletScript = () => {
      if ((window as any).L) {
        initMap();
        return;
      }
      const existingScript = document.getElementById("leaflet-js");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap();
        script.onerror = () =>
          setMapError(
            "Unable to load the map library. Rider and order details remain available.",
          );
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", () => initMap());
      }
    };

    loadLeafletScript();
  }, []);

  const initMap = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (!leafletInstanceRef.current) {
      // Default centered on Dhaka, Bangladesh
      const map = L.map(mapRef.current).setView([23.8103, 90.4125], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      setMapError("");
    }

    renderMarkers();
  }, [riders, orders]);

  useEffect(() => {
    if (leafletInstanceRef.current) {
      renderMarkers();
    }
  }, [riders, orders]);

  const renderMarkers = () => {
    const L = (window as any).L;
    if (!L || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    const bounds: [number, number][] = [];

    // Render Riders and their sequence waypoints
    riders.forEach((rider, index) => {
      const color = RIDER_COLORS[index % RIDER_COLORS.length];
      const history = rider.locationHistory || [];

      const points: [number, number][] = [];

      history.forEach((loc) => {
        points.push([loc.latitude, loc.longitude]);
        bounds.push([loc.latitude, loc.longitude]);

        // Sequence Marker Pinpoint (1, 2, 3...)
        const seqHtml = `<div style="background-color: ${color}; color: white; border-radius: 9999px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white;">${loc.sequence}</div>`;

        const icon = L.divIcon({
          html: seqHtml,
          className: "leaflet-seq-marker",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        L.marker([loc.latitude, loc.longitude], { icon }).addTo(
          layerGroupRef.current,
        ).bindPopup(`
            <div style="font-size: 12px; font-family: sans-serif;">
              <strong>${escapeHtml(rider.name)}</strong> (Point #${loc.sequence})<br/>
              Phone: ${escapeHtml(rider.phoneOriginal)}<br/>
              Time: ${new Date(loc.createdAt).toLocaleTimeString()}
            </div>
          `);
      });

      // Connect sequence waypoints with a colored line
      if (points.length > 1) {
        L.polyline(points, {
          color,
          weight: 3,
          opacity: 0.8,
          dashArray: "5, 10",
        }).addTo(layerGroupRef.current);
      }

      // Latest Current Location Pin for Rider
      if (rider.currentLat !== null && rider.currentLng !== null) {
        bounds.push([rider.currentLat, rider.currentLng]);

        const currentHtml = `<div style="background-color: ${color}; color: white; border-radius: 9999px; padding: 4px 8px; font-size: 11px; font-weight: 600; border: 2px solid white; white-space: nowrap;">${escapeHtml(rider.name)}</div>`;

        const icon = L.divIcon({
          html: currentHtml,
          className: "leaflet-current-rider",
          iconSize: [100, 26],
          iconAnchor: [50, 13],
        });

        L.marker([rider.currentLat, rider.currentLng], { icon }).addTo(
          layerGroupRef.current,
        ).bindPopup(`
            <div style="font-size: 13px; font-family: sans-serif; min-width: 160px;">
              <strong>${escapeHtml(rider.name)}</strong> (Active rider)<br/>
              Phone: ${escapeHtml(rider.phoneOriginal)}<br/>
              Zone: ${escapeHtml(rider.operatingZone || "N/A")}<br/>
              Vehicle: ${escapeHtml(rider.vehicleType)}<br/>
              Waypoints recorded: ${history.length}
            </div>
          `);
      }
    });

    // Render Active Customer Orders
    orders.forEach((order) => {
      const lat = order.address?.latitude;
      const lng = order.address?.longitude;

      if (
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined
      ) {
        bounds.push([lat, lng]);

        const orderHtml = `<div style="background-color: #111114; color: white; border-radius: 9999px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; border: 2px solid white;">O</div>`;

        const icon = L.divIcon({
          html: orderHtml,
          className: "leaflet-order-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const assignedRider = riders.find(
          (r) => r.id === order.assignedDeliveryPersonnelId,
        );

        L.marker([lat, lng], { icon }).addTo(layerGroupRef.current).bindPopup(`
            <div style="font-size: 13px; font-family: sans-serif;">
              <strong>Order #${escapeHtml(order.reference)}</strong><br/>
              Recipient: ${escapeHtml(order.address?.recipientName || "Customer")}<br/>
              Address: ${escapeHtml(order.address?.detailedAddress || "")}, ${escapeHtml(order.address?.district || "")}<br/>
              Assigned rider: ${escapeHtml(assignedRider ? assignedRider.name : "Unassigned")}<br/>
              Status: ${escapeHtml(order.shipmentStatus)}
            </div>
          `);
      }
    });

    if (bounds.length > 0 && leafletInstanceRef.current) {
      leafletInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleClearHistory = async (riderId: string, riderName: string) => {
    if (
      !confirm(
        `Are you sure you want to clear all location waypoints for ${riderName}? This will remove points 1, 2, 3... and keep only their current position pin.`,
      )
    ) {
      return;
    }
    setClearingId(riderId);
    try {
      const res = await fetch(
        `/api/delivery-personnel/${riderId}/location-history`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        await loadData();
      } else {
        alert("Failed to clear location history.");
      }
    } catch {
      alert("Error clearing location history.");
    } finally {
      setClearingId(null);
    }
  };

  return (
    <>
      <Topbar
        title="Live delivery map"
        subtitle="Private rider locations and active delivery assignments"
      />

      <div className="space-y-6 p-4 xl:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Delivery operations
            </p>
            <p className="mt-1 text-[13px] text-ink">
              {riders.length} active riders · {orders.length} active orders
            </p>
            <p className="mt-1 text-[11px] text-ink2">
              {lastUpdatedAt
                ? `Last updated ${lastUpdatedAt.toLocaleTimeString("en-BD", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : "Waiting for the first location update"}
              {" · Refreshes every 30 seconds"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(false)}
            disabled={loading || refreshing}
            className="self-start rounded-full border border-line px-5 py-2 text-[12px] font-medium text-ink hover:border-ink disabled:opacity-50 sm:self-auto"
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-8">
            <section>
              <h2 className="text-[14px] font-semibold text-ink">
                Active riders
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink2">
                Color identifies each rider path; numbered points show location
                update sequence.
              </p>

              <div className="mt-4 divide-y divide-line border-y border-line">
                {riders.map((rider, index) => {
                  const color = RIDER_COLORS[index % RIDER_COLORS.length];
                  return (
                    <div
                      key={rider.id}
                      className="flex items-start justify-between gap-3 py-3 text-[13px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium text-ink">{rider.name}</p>
                          <p className="text-[11px] text-ink2">
                            {rider.phoneOriginal}
                          </p>
                          <p className="font-mono text-[11px] text-ink2">
                            {rider.locationHistory?.length || 0} waypoints ·{" "}
                            {rider.vehicleType.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {(rider.locationHistory?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleClearHistory(rider.id, rider.name)
                          }
                          disabled={clearingId === rider.id}
                          className="shrink-0 text-[11px] text-rose-700 underline decoration-line underline-offset-4 disabled:opacity-50"
                        >
                          {clearingId === rider.id ? "Clearing…" : "Clear path"}
                        </button>
                      )}
                    </div>
                  );
                })}

                {riders.length === 0 && !loading && (
                  <p className="py-8 text-center text-[12px] text-ink2">
                    No active riders found.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-[14px] font-semibold text-ink">
                Active customer orders ({orders.length})
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Orders with saved coordinates appear as dark order markers.
              </p>
              <div className="mt-4 max-h-64 divide-y divide-line overflow-y-auto border-y border-line">
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const assignedRider = riders.find(
                      (rider) => rider.id === order.assignedDeliveryPersonnelId,
                    );
                    return (
                      <div key={order.id} className="py-3 text-[12px]">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-ink">
                            #{order.reference}
                          </p>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink2">
                            {order.shipmentStatus
                              .replaceAll("_", " ")
                              .toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-ink2">
                          {order.address?.recipientName || "Customer"} ·{" "}
                          {order.address?.district || "No district"}
                        </p>
                        <p className="mt-1 text-[11px] text-ink2">
                          {assignedRider
                            ? `Assigned to ${assignedRider.name}`
                            : "Unassigned"}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-[12px] text-ink2">
                    No active delivery orders found.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <section
            aria-label="Delivery location map"
            className="relative h-[640px] overflow-hidden rounded-card border border-line bg-surface"
          >
            <div ref={mapRef} className="z-0 h-full w-full" />
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-[13px] text-ink2">
                Loading delivery locations…
              </div>
            )}
            {mapError && !loading && (
              <div
                role="alert"
                className="absolute inset-0 z-10 flex items-center justify-center bg-paper p-8 text-center text-[13px] text-rose-700"
              >
                {mapError}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
