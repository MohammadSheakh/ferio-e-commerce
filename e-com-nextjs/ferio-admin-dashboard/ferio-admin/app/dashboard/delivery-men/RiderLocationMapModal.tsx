"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

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

export default function RiderLocationMapModal({
  riderId,
  riderName,
  onClose,
}: {
  riderId: string;
  riderName: string;
  onClose: () => void;
}) {
  const [rider, setRider] = useState<RiderMapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const fetchRiderData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/delivery-personnel/map-data", {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || "Failed to load location data.");
      }
      const found = (payload.data.riders || []).find(
        (r: any) => r.id === riderId,
      );
      if (found) {
        setRider(found);
      } else {
        throw new Error("Rider location record not found.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error loading location history.",
      );
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    void fetchRiderData();
  }, [fetchRiderData]);

  // Leaflet JS & CSS loader
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
      const map = L.map(mapRef.current).setView([23.8103, 90.4125], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    renderRiderMap();
  }, [rider]);

  useEffect(() => {
    if (leafletInstanceRef.current && rider) {
      renderRiderMap();
    }
  }, [rider]);

  const renderRiderMap = () => {
    const L = (window as any).L;
    if (!L || !layerGroupRef.current || !rider) return;

    layerGroupRef.current.clearLayers();
    const bounds: [number, number][] = [];
    const points: [number, number][] = [];
    const color = "#e11d48"; // Distinct red indicator

    const history = rider.locationHistory || [];

    // Render sequence waypoints 1, 2, 3...
    history.forEach((loc) => {
      points.push([loc.latitude, loc.longitude]);
      bounds.push([loc.latitude, loc.longitude]);

      const seqHtml = `<div style="background-color: ${color}; color: white; border-radius: 9999px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${loc.sequence}</div>`;

      const icon = L.divIcon({
        html: seqHtml,
        className: "leaflet-seq-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([loc.latitude, loc.longitude], { icon })
        .addTo(layerGroupRef.current)
        .bindPopup(`
          <div style="font-size: 12px; font-family: sans-serif;">
            <strong>${rider.name}</strong> (Waypoint #${loc.sequence})<br/>
            Time: ${new Date(loc.createdAt).toLocaleTimeString()}
          </div>
        `);
    });

    // Draw route line between sequence points
    if (points.length > 1) {
      L.polyline(points, {
        color,
        weight: 4,
        opacity: 0.85,
        dashArray: "6, 8",
      }).addTo(layerGroupRef.current);
    }

    // Render Current Location Pin
    if (rider.currentLat && rider.currentLng) {
      bounds.push([rider.currentLat, rider.currentLng]);

      const currentHtml = `<div style="background-color: #111114; color: white; border-radius: 9999px; padding: 5px 10px; font-size: 12px; font-weight: bold; border: 2px solid #e11d48; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📍 ${rider.name} (Current Location)</div>`;

      const icon = L.divIcon({
        html: currentHtml,
        className: "leaflet-current-rider",
        iconSize: [160, 28],
        iconAnchor: [80, 14],
      });

      L.marker([rider.currentLat, rider.currentLng], { icon })
        .addTo(layerGroupRef.current)
        .bindPopup(`
          <div style="font-size: 13px; font-family: sans-serif;">
            <strong style="color: #e11d48;">${rider.name}</strong><br/>
            Current Location Pin<br/>
            Last Ping: ${rider.lastLocationAt ? new Date(rider.lastLocationAt).toLocaleTimeString() : "N/A"}
          </div>
        `);
    }

    if (bounds.length > 0 && leafletInstanceRef.current) {
      leafletInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleClearHistory = async () => {
    if (
      !confirm(
        `Are you sure you want to clear all past location waypoints (1, 2, 3...) for ${riderName}? Only the current location pin will be retained.`,
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch(
        `/api/delivery-personnel/${riderId}/location-history`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        await fetchRiderData();
      } else {
        alert("Failed to clear location history.");
      }
    } catch {
      alert("Error clearing location history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-card border border-line bg-paper p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-[18px] font-semibold text-ink">
              Rider Live Route Map:{" "}
              <span className="text-rose-600">{riderName}</span>
            </h2>
            <p className="text-[12px] text-ink2">
              Viewing sequential location history pins (1, 2, 3...) and live
              position on OpenStreetMap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink2 hover:bg-surface hover:text-ink transition"
          >
            ✕
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-line bg-surface/50 px-3 my-2 rounded-card text-[12px]">
          <div className="flex items-center gap-4 text-ink">
            <span>
              Waypoints recorded:{" "}
              <strong>{rider?.locationHistory?.length || 0}</strong>
            </span>
            {rider?.lastLocationAt && (
              <span className="text-ink2">
                Last update:{" "}
                {new Date(rider.lastLocationAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(rider?.locationHistory?.length || 0) > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1.5 font-medium text-rose-700 hover:bg-rose-100 transition"
              >
                {clearing ? "Clearing..." : "Clear Location History"}
              </button>
            )}

            <Link
              href="/dashboard/delivery-map"
              className="rounded-full bg-ink px-4 py-1.5 font-medium text-white hover:opacity-90 transition inline-flex items-center gap-1"
            >
              🗺️ Open All Riders Fleet Map
            </Link>
          </div>
        </div>

        {error && (
          <div className="my-2 rounded-card bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-700">
            {error}
          </div>
        )}

        {/* OpenStreetMap Box */}
        <div className="relative flex-1 min-h-[420px] rounded-card border border-line overflow-hidden mt-1">
          <div ref={mapRef} className="w-full h-full min-h-[420px] z-0" />
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-[13px] text-ink2">
              Loading OpenStreetMap route data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
