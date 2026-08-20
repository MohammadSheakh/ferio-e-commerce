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

export default function DeliveryMapPage() {
  const [riders, setRiders] = useState<RiderMapItem[]>([]);
  const [orders, setOrders] = useState<OrderMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearingId, setClearingId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/delivery-personnel/map-data", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || "Failed to load map data.");
      }
      setRiders(payload.data.riders || []);
      setOrders(payload.data.activeOrders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
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

        L.marker([loc.latitude, loc.longitude], { icon })
          .addTo(layerGroupRef.current)
          .bindPopup(`
            <div style="font-size: 12px; font-family: sans-serif;">
              <strong>${rider.name}</strong> (Point #${loc.sequence})<br/>
              Phone: ${rider.phoneOriginal}<br/>
              Time: ${new Date(loc.createdAt).toLocaleTimeString()}
            </div>
          `);
      });

      // Connect sequence waypoints with a colored line
      if (points.length > 1) {
        L.polyline(points, { color, weight: 3, opacity: 0.8, dashArray: "5, 10" }).addTo(
          layerGroupRef.current,
        );
      }

      // Latest Current Location Pin for Rider
      if (rider.currentLat && rider.currentLng) {
        bounds.push([rider.currentLat, rider.currentLng]);

        const currentHtml = `<div style="background-color: ${color}; color: white; border-radius: 9999px; padding: 4px 8px; font-size: 11px; font-weight: bold; border: 2px solid white; white-space: nowrap;">📍 ${rider.name}</div>`;

        const icon = L.divIcon({
          html: currentHtml,
          className: "leaflet-current-rider",
          iconSize: [100, 26],
          iconAnchor: [50, 13],
        });

        L.marker([rider.currentLat, rider.currentLng], { icon })
          .addTo(layerGroupRef.current)
          .bindPopup(`
            <div style="font-size: 13px; font-family: sans-serif; min-width: 160px;">
              <strong style="color: ${color};">${rider.name}</strong> (Active Rider)<br/>
              Phone: ${rider.phoneOriginal}<br/>
              Zone: ${rider.operatingZone || "N/A"}<br/>
              Vehicle: ${rider.vehicleType}<br/>
              Waypoints recorded: ${history.length}
            </div>
          `);
      }
    });

    // Render Active Customer Orders
    orders.forEach((order) => {
      const lat = order.address?.latitude;
      const lng = order.address?.longitude;

      if (lat && lng) {
        bounds.push([lat, lng]);

        const orderHtml = `<div style="background-color: #111114; color: white; border-radius: 9999px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white;">📦</div>`;

        const icon = L.divIcon({
          html: orderHtml,
          className: "leaflet-order-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const assignedRider = riders.find((r) => r.id === order.assignedDeliveryPersonnelId);

        L.marker([lat, lng], { icon })
          .addTo(layerGroupRef.current)
          .bindPopup(`
            <div style="font-size: 13px; font-family: sans-serif;">
              <strong>Order #${order.reference}</strong><br/>
              Recipient: ${order.address?.recipientName || "Customer"}<br/>
              Address: ${order.address?.detailedAddress || ""}, ${order.address?.district || ""}<br/>
              Assigned Rider: ${assignedRider ? assignedRider.name : "Unassigned"}<br/>
              Status: ${order.shipmentStatus}
            </div>
          `);
      }
    });

    if (bounds.length > 0 && leafletInstanceRef.current) {
      leafletInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleClearHistory = async (riderId: string, riderName: string) => {
    if (!confirm(`Are you sure you want to clear all location waypoints for ${riderName}? This will remove points 1, 2, 3... and keep only their current position pin.`)) {
      return;
    }
    setClearingId(riderId);
    try {
      const res = await fetch(`/api/delivery-personnel/${riderId}/location-history`, {
        method: "DELETE",
      });
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
        title="Live Delivery Map"
        subtitle="Visual OpenStreetMap tracking for active delivery riders & customer orders"
      />

      <div className="p-8 space-y-6">
        {error && (
          <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Controls & Riders List */}
          <div className="space-y-4">
            <div className="rounded-card border border-line bg-paper p-5 space-y-3">
              <h3 className="text-[14px] font-semibold text-ink">Active Riders Map Legend</h3>
              <p className="text-[12px] text-ink2 leading-relaxed">
                Each rider is assigned a unique color pin. Waypoints show their sequence path (1, 2, 3...) when they update GPS location.
              </p>

              <div className="space-y-2 pt-2 divide-y divide-line">
                {riders.map((r, i) => {
                  const color = RIDER_COLORS[i % RIDER_COLORS.length];
                  return (
                    <div key={r.id} className="pt-2 flex items-start justify-between gap-2 text-[13px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="font-medium text-ink">{r.name}</p>
                          <p className="text-[11px] text-ink2">{r.phoneOriginal}</p>
                          <p className="text-[11px] text-ink2 font-mono">
                            {r.locationHistory?.length || 0} waypoints recorded
                          </p>
                        </div>
                      </div>

                      {(r.locationHistory?.length || 0) > 0 && (
                        <button
                          onClick={() => handleClearHistory(r.id, r.name)}
                          disabled={clearingId === r.id}
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] text-rose-700 hover:bg-rose-50 transition shrink-0"
                        >
                          Clear Path
                        </button>
                      )}
                    </div>
                  );
                })}

                {riders.length === 0 && !loading && (
                  <p className="text-[12px] text-ink2 pt-2">No active riders found.</p>
                )}
              </div>
            </div>

            <div className="rounded-card border border-line bg-paper p-5 space-y-3">
              <h3 className="text-[14px] font-semibold text-ink">Active Customer Orders ({orders.length})</h3>
              <p className="text-[12px] text-ink2">
                Orders with delivery coordinates are plotted as dark 📦 markers.
              </p>
              <div className="space-y-2 pt-1 max-h-60 overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id} className="border-b border-line pb-2 text-[12px]">
                    <p className="font-medium text-ink">#{o.reference}</p>
                    <p className="text-ink2">{o.address?.recipientName} • {o.address?.district}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OpenStreetMap Render Container */}
          <div className="rounded-card border border-line bg-paper overflow-hidden h-[640px] relative">
            <div ref={mapRef} className="w-full h-full z-0" />
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-[13px] text-ink2">
                Loading OpenStreetMap data...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
