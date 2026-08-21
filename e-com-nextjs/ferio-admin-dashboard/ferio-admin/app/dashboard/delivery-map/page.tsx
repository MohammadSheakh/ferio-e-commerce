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
  createdAt?: string;
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

// Area fallback coordinates lookup table for Bangladesh
const AREA_COORDINATES: Record<string, [number, number]> = {
  rampura: [23.7612, 90.4208],
  badda: [23.7806, 90.4267],
  dhanmondi: [23.7461, 90.3742],
  gulshan: [23.7925, 90.4078],
  banani: [23.7937, 90.4047],
  mirpur: [23.8069, 90.3687],
  uttara: [23.8759, 90.3795],
  mohammadpur: [23.7658, 90.3582],
  motijheel: [23.733, 90.4172],
  jatrabari: [23.7104, 90.4348],
  khilgaon: [23.7516, 90.4241],
  "old dhaka": [23.7099, 90.4071],
  chittagong: [22.3569, 91.7832],
  sylhet: [24.8949, 91.8687],
  rajshahi: [24.3745, 88.6042],
  khulna: [22.8456, 89.5403],
  barisal: [22.701, 90.3535],
  rangpur: [25.7439, 89.2752],
  mymensingh: [24.7471, 90.4203],
  comilla: [23.4607, 91.1809],
  gazipur: [23.9999, 90.4203],
  narayanganj: [23.6238, 90.5],
};

function getOrderCoordinates(order: OrderMapItem): [number, number] | null {
  if (
    order.address?.latitude !== null &&
    order.address?.latitude !== undefined &&
    order.address?.longitude !== null &&
    order.address?.longitude !== undefined
  ) {
    return [order.address.latitude, order.address.longitude];
  }

  // Check fallback area
  const areaKey = (order.address?.area || "").toLowerCase().trim();
  const districtKey = (order.address?.district || "").toLowerCase().trim();

  for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
    if (areaKey.includes(key) || districtKey.includes(key)) {
      // Add slight random offset so multiple orders in same area don't overlap completely
      const latOffset = (Math.random() - 0.5) * 0.005;
      const lngOffset = (Math.random() - 0.5) * 0.005;
      return [coords[0] + latOffset, coords[1] + lngOffset];
    }
  }

  // Default Dhaka fallback
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;
  return [23.8103 + latOffset, 90.4125 + lngOffset];
}

export type OrderStatusInfo = {
  emoji: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
};

function getOrderStatusInfo(status: string): OrderStatusInfo {
  const normalized = (status || "").toUpperCase();
  switch (normalized) {
    case "PENDING_CONFIRMATION":
    case "PENDING":
      return {
        emoji: "⏳",
        label: "Pending",
        badgeBg: "#fef3c7",
        badgeText: "#92400e",
        borderColor: "#f59e0b",
      };
    case "CONFIRMED":
      return {
        emoji: "✅",
        label: "Confirmed",
        badgeBg: "#dbeafe",
        badgeText: "#1e40af",
        borderColor: "#3b82f6",
      };
    case "DELIVERED":
      return {
        emoji: "🚚",
        label: "Delivered",
        badgeBg: "#d1fae5",
        badgeText: "#065f46",
        borderColor: "#10b981",
      };
    case "COMPLETED":
      return {
        emoji: "🎉",
        label: "Completed",
        badgeBg: "#f3e8ff",
        badgeText: "#6b21a8",
        borderColor: "#8b5cf6",
      };
    case "CANCELLED":
      return {
        emoji: "❌",
        label: "Cancelled",
        badgeBg: "#ffe4e6",
        badgeText: "#9f1239",
        borderColor: "#f43f5e",
      };
    default:
      return {
        emoji: "📦",
        label: status,
        badgeBg: "#f3f4f6",
        badgeText: "#1f2937",
        borderColor: "#6b7280",
      };
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const geocodeCacheMap = new Map<
  string,
  { road: string; suburb: string; city: string; full: string }
>();

async function getAddressFromCoordsMap(
  lat: number,
  lng: number,
): Promise<{ road: string; suburb: string; city: string; full: string }> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCacheMap.has(key)) {
    return geocodeCacheMap.get(key)!;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) throw new Error("Failed to reverse geocode");
    const data = await res.json();
    const addr = data.address || {};

    const road =
      addr.road ||
      addr.pedestrian ||
      addr.highway ||
      addr.path ||
      addr.neighbourhood ||
      addr.amenity ||
      "N/A";
    const suburb =
      addr.suburb ||
      addr.residential ||
      addr.quarter ||
      addr.village ||
      addr.town ||
      addr.county ||
      "N/A";
    const city =
      addr.city ||
      addr.state_district ||
      addr.district ||
      addr.state ||
      "N/A";

    const full = data.display_name || `${road}, ${suburb}, ${city}`;

    const result = { road, suburb, city, full };
    geocodeCacheMap.set(key, result);
    return result;
  } catch {
    return {
      road: "Location details unavailable",
      suburb: "N/A",
      city: "N/A",
      full: "Address unavailable",
    };
  }
}

function buildMapWaypointPopupHtml(
  riderId: string,
  riderName: string,
  phone: string,
  sequence: number,
  timeStr: string,
  geo?: { road: string; suburb: string; city: string },
  loading = false,
) {
  return `
    <div style="font-size: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 210px; padding: 2px;">
      <div style="font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; font-size: 13px;">
        ${escapeHtml(riderName)} <span style="font-weight: 400; color: #6b7280;">(Point #${sequence})</span>
      </div>
      <div style="font-size: 11.5px; color: #374151; line-height: 1.5; margin-bottom: 6px;">
        <div>📍 <strong>Road:</strong> ${escapeHtml(geo?.road || (loading ? "Loading..." : "N/A"))}</div>
        <div>🏡 <strong>Suburb:</strong> ${escapeHtml(geo?.suburb || (loading ? "Loading..." : "N/A"))}</div>
        <div>🏙️ <strong>City:</strong> ${escapeHtml(geo?.city || (loading ? "Loading..." : "N/A"))}</div>
      </div>
      <div style="font-size: 10.5px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 4px; margin-bottom: 6px;">
        Phone: ${escapeHtml(phone)} · Time: ${escapeHtml(timeStr)}
      </div>
      <div style="border-top: 1px solid #f3f4f6; padding-top: 6px; display: flex; justify-content: flex-end;">
        <button
          type="button"
          onclick="window.removeRiderPinFromMap('${riderId}')"
          style="background: #ffe4e6; color: #9f1239; border: 1px solid #f43f5e; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer;"
        >
          👁️ Hide Rider Pins
        </button>
      </div>
    </div>
  `;
}

function buildMapCurrentRiderPopupHtml(
  riderId: string,
  riderName: string,
  phone: string,
  operatingZone: string,
  vehicleType: string,
  waypointsCount: number,
  timeStr: string,
  geo?: { road: string; suburb: string; city: string },
  loading = false,
) {
  return `
    <div style="font-size: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 220px; padding: 2px;">
      <div style="font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; font-size: 13px;">
        ${escapeHtml(riderName)} <span style="font-weight: 600; color: #e11d48;">(Current Position)</span>
      </div>
      <div style="font-size: 11.5px; color: #374151; line-height: 1.5; margin-bottom: 6px;">
        <div>📍 <strong>Road:</strong> ${escapeHtml(geo?.road || (loading ? "Loading..." : "N/A"))}</div>
        <div>🏡 <strong>Suburb:</strong> ${escapeHtml(geo?.suburb || (loading ? "Loading..." : "N/A"))}</div>
        <div>🏙️ <strong>City:</strong> ${escapeHtml(geo?.city || (loading ? "Loading..." : "N/A"))}</div>
      </div>
      <div style="font-size: 10.5px; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 4px; line-height: 1.4; margin-bottom: 6px;">
        Phone: ${escapeHtml(phone)} · Zone: ${escapeHtml(operatingZone || "N/A")}<br/>
        Vehicle: ${escapeHtml(vehicleType)} · Waypoints: ${waypointsCount} · Last Ping: ${escapeHtml(timeStr)}
      </div>
      <div style="border-top: 1px solid #f3f4f6; padding-top: 6px; display: flex; justify-content: flex-end;">
        <button
          type="button"
          onclick="window.removeRiderPinFromMap('${riderId}')"
          style="background: #ffe4e6; color: #9f1239; border: 1px solid #f43f5e; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer;"
        >
          👁️ Hide Rider Pins
        </button>
      </div>
    </div>
  `;
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

  // Administrative map controls state
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [removedPinIds, setRemovedPinIds] = useState<Set<string>>(new Set());
  const [hiddenRiderIds, setHiddenRiderIds] = useState<Set<string>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Expose remove/hide single pin handlers to window for Leaflet popup button clicks
  useEffect(() => {
    (window as any).removeOrderPinFromMap = (orderId: string) => {
      setRemovedPinIds((prev) => new Set([...prev, orderId]));
    };
    (window as any).removeRiderPinFromMap = (riderId: string) => {
      setHiddenRiderIds((prev) => new Set([...prev, riderId]));
    };
    return () => {
      delete (window as any).removeOrderPinFromMap;
      delete (window as any).removeRiderPinFromMap;
    };
  }, []);

  // Keyboard shortcut listener to exit fullscreen mode via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  // Recalculate Leaflet map viewport size when toggling between normal view and full page mode
  useEffect(() => {
    if (leafletInstanceRef.current) {
      const timer = setTimeout(() => {
        leafletInstanceRef.current.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

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
  }, [riders, orders, statusFilter, removedPinIds, hiddenRiderIds]);

  useEffect(() => {
    if (leafletInstanceRef.current) {
      renderMarkers();
    }
  }, [riders, orders, statusFilter, removedPinIds, hiddenRiderIds]);

  const renderMarkers = () => {
    const L = (window as any).L;
    if (!L || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    const bounds: [number, number][] = [];

    // Render Riders and their sequence waypoints (if not hidden by admin)
    riders.forEach((rider, index) => {
      if (hiddenRiderIds.has(rider.id)) return;

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

        const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(
          layerGroupRef.current,
        );

        const timeStr = new Date(loc.createdAt).toLocaleTimeString();
        const cacheKey = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
        const cached = geocodeCacheMap.get(cacheKey);

        marker.bindPopup(
          buildMapWaypointPopupHtml(
            rider.id,
            rider.name,
            rider.phoneOriginal,
            loc.sequence,
            timeStr,
            cached,
            !cached,
          ),
        );
        marker.bindTooltip(
          cached
            ? `${cached.road}, ${cached.suburb}, ${cached.city}`
            : `Point #${loc.sequence}`,
          { direction: "top", offset: [0, -10] },
        );

        marker.on("popupopen", async () => {
          const geo = await getAddressFromCoordsMap(loc.latitude, loc.longitude);
          marker.setPopupContent(
            buildMapWaypointPopupHtml(
              rider.id,
              rider.name,
              rider.phoneOriginal,
              loc.sequence,
              timeStr,
              geo,
              false,
            ),
          );
          marker.setTooltipContent(`${geo.road}, ${geo.suburb}, ${geo.city}`);
        });
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

        const currentHtml = `<div style="background-color: ${color}; color: white; border-radius: 9999px; padding: 4px 8px; font-size: 11px; font-weight: 600; border: 2px solid white; white-space: nowrap;">🚴 ${escapeHtml(rider.name)}</div>`;

        const icon = L.divIcon({
          html: currentHtml,
          className: "leaflet-current-rider",
          iconSize: [110, 26],
          iconAnchor: [55, 13],
        });

        const currentMarker = L.marker([rider.currentLat, rider.currentLng], { icon }).addTo(
          layerGroupRef.current,
        );

        const timeStr = rider.lastLocationAt
          ? new Date(rider.lastLocationAt).toLocaleTimeString()
          : "N/A";
        const cacheKey = `${rider.currentLat.toFixed(4)},${rider.currentLng.toFixed(4)}`;
        const cachedCurrent = geocodeCacheMap.get(cacheKey);

        currentMarker.bindPopup(
          buildMapCurrentRiderPopupHtml(
            rider.id,
            rider.name,
            rider.phoneOriginal,
            rider.operatingZone || "Unassigned",
            rider.vehicleType,
            history.length,
            timeStr,
            cachedCurrent,
            !cachedCurrent,
          ),
        );
        currentMarker.bindTooltip(
          cachedCurrent
            ? `📍 ${cachedCurrent.road}, ${cachedCurrent.suburb}, ${cachedCurrent.city}`
            : `📍 ${rider.name} Current`,
          { direction: "top", offset: [0, -14] },
        );

        currentMarker.on("popupopen", async () => {
          const geo = await getAddressFromCoordsMap(
            rider.currentLat!,
            rider.currentLng!,
          );
          currentMarker.setPopupContent(
            buildMapCurrentRiderPopupHtml(
              rider.id,
              rider.name,
              rider.phoneOriginal,
              rider.operatingZone || "Unassigned",
              rider.vehicleType,
              history.length,
              timeStr,
              geo,
              false,
            ),
          );
          currentMarker.setTooltipContent(
            `📍 ${geo.road}, ${geo.suburb}, ${geo.city}`,
          );
        });
      }
    });

    // Filter customer orders based on status & removed pinpoints
    const filteredOrders = orders.filter((order) => {
      if (removedPinIds.has(order.id)) return false;
      if (statusFilter === "ALL") return true;
      const normalizedStatus = (order.status || "").toUpperCase();
      if (statusFilter === "PENDING") {
        return (
          normalizedStatus === "PENDING_CONFIRMATION" ||
          normalizedStatus === "PENDING"
        );
      }
      return normalizedStatus === statusFilter;
    });

    // Render Active Customer Orders with Emoji Status Markers
    filteredOrders.forEach((order) => {
      const coords = getOrderCoordinates(order);

      if (coords) {
        const [lat, lng] = coords;
        bounds.push([lat, lng]);

        const statusInfo = getOrderStatusInfo(order.status);

        const orderHtml = `
          <div style="
            background-color: ${statusInfo.badgeBg};
            color: ${statusInfo.badgeText};
            border: 2px solid ${statusInfo.borderColor};
            border-radius: 9999px;
            padding: 3px 7px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 5px rgba(0,0,0,0.25);
            white-space: nowrap;
            cursor: pointer;
          ">
            <span>${statusInfo.emoji}</span>
            <span>#${escapeHtml(order.reference)}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: orderHtml,
          className: "leaflet-order-emoji-pin",
          iconSize: [95, 26],
          iconAnchor: [47, 13],
        });

        const assignedRider = riders.find(
          (r) => r.id === order.assignedDeliveryPersonnelId,
        );

        const recipient = escapeHtml(order.address?.recipientName || "Customer");
        const phone = escapeHtml(order.address?.phoneOriginal || "N/A");
        const addressStr = escapeHtml(
          `${order.address?.detailedAddress || ""}, ${order.address?.area || ""}, ${order.address?.district || ""}`,
        );

        const marker = L.marker([lat, lng], { icon }).addTo(layerGroupRef.current);

        const popupHtml = `
          <div style="font-size: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #111827; font-size: 13px;">
                Order #${escapeHtml(order.reference)}
              </span>
              <span style="background-color: ${statusInfo.badgeBg}; color: ${statusInfo.badgeText}; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 700;">
                ${statusInfo.emoji} ${statusInfo.label}
              </span>
            </div>
            <div style="font-size: 11.5px; color: #374151; line-height: 1.5; margin-bottom: 8px;">
              <div>👤 <strong>Recipient:</strong> ${recipient}</div>
              <div>📞 <strong>Phone:</strong> ${phone}</div>
              <div>📍 <strong>Address (Typed):</strong> <span style="font-weight: 600; color: #111827;">${addressStr}</span></div>
              <div id="osm-geo-${order.id}" style="font-size: 10.5px; color: #6b7280; font-style: italic; margin-top: 2px;">
                🗺️ Map Location: Loading...
              </div>
              <div style="margin-top: 4px;">৳ <strong>Total:</strong> ৳${order.total}</div>
              <div>🚴 <strong>Rider:</strong> ${escapeHtml(assignedRider ? assignedRider.name : "Unassigned")}</div>
            </div>
            <div style="border-top: 1px solid #f3f4f6; padding-top: 6px; display: flex; justify-content: flex-end;">
              <button
                type="button"
                onclick="window.removeOrderPinFromMap('${order.id}')"
                style="background: #ffe4e6; color: #9f1239; border: 1px solid #f43f5e; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer;"
              >
                🗑️ Hide Pinpoint
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        marker.bindTooltip(
          `${statusInfo.emoji} #${order.reference} · ${order.address?.detailedAddress || order.address?.area || order.address?.district || "Address"}`,
          { direction: "top", offset: [0, -12] },
        );

        marker.on("popupopen", async () => {
          const geo = await getAddressFromCoordsMap(lat, lng);
          const el = document.getElementById(`osm-geo-${order.id}`);
          if (el) {
            el.innerHTML = `🗺️ Map Location: ${escapeHtml(geo.road)}, ${escapeHtml(geo.suburb)}, ${escapeHtml(geo.city)}`;
          }
        });
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

  const handleRemoveAllPinpoints = () => {
    if (confirm("Are you sure you want to clear all order pinpoints from the map view?")) {
      const allIds = new Set(orders.map((o) => o.id));
      setRemovedPinIds(allIds);
    }
  };

  const handleRestoreAllPinpoints = () => {
    setRemovedPinIds(new Set());
  };

  const handleRestoreAllRiders = () => {
    setHiddenRiderIds(new Set());
  };

  return (
    <>
      <Topbar
        title="Live delivery map"
        subtitle="Customer order status pinpoints and active rider locations"
      />

      <div className="space-y-6 p-4 xl:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Spatial Order Distribution & Delivery Operations
            </p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {riders.length - hiddenRiderIds.size} visible riders ({hiddenRiderIds.size} hidden) · {orders.length - removedPinIds.size} visible order pinpoints
            </p>
            <p className="mt-1 text-[11px] text-ink2">
              {lastUpdatedAt
                ? `Last updated ${lastUpdatedAt.toLocaleTimeString("en-BD", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : "Waiting for location data..."}
              {" · Refreshes every 30 seconds"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hiddenRiderIds.size > 0 && (
              <button
                type="button"
                onClick={handleRestoreAllRiders}
                className="rounded-full bg-rose-50 border border-rose-300 px-4 py-1.5 text-[12px] font-semibold text-rose-800 hover:bg-rose-100 transition-colors"
              >
                🚴 Restore All Riders ({hiddenRiderIds.size} hidden)
              </button>
            )}

            {removedPinIds.size > 0 ? (
              <button
                type="button"
                onClick={handleRestoreAllPinpoints}
                className="rounded-full bg-emerald-50 border border-emerald-300 px-4 py-1.5 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                🔄 Restore All Orders ({removedPinIds.size} hidden)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveAllPinpoints}
                disabled={orders.length === 0}
                className="rounded-full bg-rose-50 border border-rose-200 px-4 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
              >
                🧹 Remove All Orders
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadData(false)}
              disabled={loading || refreshing}
              className="rounded-full border border-line px-5 py-1.5 text-[12px] font-medium text-ink hover:border-ink disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
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

        {/* Map Filter & View Mode Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-card border border-line">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink2 mr-2">
              Filter Pinpoints:
            </span>
            {[
              { id: "ALL", label: "All Orders" },
              { id: "PENDING", label: "⏳ Pending" },
              { id: "CONFIRMED", label: "✅ Confirmed" },
              { id: "DELIVERED", label: "🚚 Delivered" },
              { id: "COMPLETED", label: "🎉 Completed" },
              { id: "CANCELLED", label: "❌ Cancelled" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                    active
                      ? "bg-ink text-white border-ink shadow-sm"
                      : "bg-white text-ink2 border-line hover:border-ink/40"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
              Map View Mode:
            </span>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                !isFullScreen
                  ? "bg-ink text-white border-ink shadow-sm"
                  : "bg-white text-ink2 border-line hover:border-ink/40"
              }`}
            >
              📱 Normal Form
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                isFullScreen
                  ? "bg-ink text-white border-ink shadow-sm"
                  : "bg-white text-ink2 border-line hover:border-ink/40"
              }`}
            >
              🖥️ Full Page Mode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-8">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-ink">
                  Active riders ({riders.length})
                </h2>
                {hiddenRiderIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAllRiders}
                    className="text-[11px] font-medium text-emerald-700 hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink2">
                Toggle pin button to hide/show rider location & waypoints on map.
              </p>

              <div className="mt-4 divide-y divide-line border-y border-line max-h-64 overflow-y-auto">
                {riders.map((rider, index) => {
                  const color = RIDER_COLORS[index % RIDER_COLORS.length];
                  const isHidden = hiddenRiderIds.has(rider.id);
                  return (
                    <div
                      key={rider.id}
                      className={`flex items-start justify-between gap-2 py-3 text-[13px] transition-opacity ${
                        isHidden ? "opacity-40 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium text-ink flex items-center gap-1.5">
                            <span>{rider.name}</span>
                            {isHidden && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                Hidden
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-ink2">
                            {rider.phoneOriginal}
                          </p>
                          <p className="font-mono text-[11px] text-ink2">
                            {rider.locationHistory?.length || 0} waypoints ·{" "}
                            {rider.vehicleType.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setHiddenRiderIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(rider.id)) {
                                next.delete(rider.id);
                              } else {
                                next.add(rider.id);
                              }
                              return next;
                            });
                          }}
                          className="text-[11px] font-medium text-ink hover:underline"
                        >
                          {isHidden ? "➕ Show Pins" : "👁️ Hide Pins"}
                        </button>

                        {(rider.locationHistory?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleClearHistory(rider.id, rider.name)
                            }
                            disabled={clearingId === rider.id}
                            className="text-[11px] text-rose-700 underline decoration-line underline-offset-4 disabled:opacity-50"
                          >
                            {clearingId === rider.id ? "Clearing…" : "Clear path"}
                          </button>
                        )}
                      </div>
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
                Customer order list ({orders.length})
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Click pin button to hide or show specific order markers.
              </p>
              <div className="mt-4 max-h-80 divide-y divide-line overflow-y-auto border-y border-line">
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const statusInfo = getOrderStatusInfo(order.status);
                    const isRemoved = removedPinIds.has(order.id);
                    return (
                      <div
                        key={order.id}
                        className={`py-3 text-[12px] transition-opacity ${
                          isRemoved ? "opacity-40 bg-slate-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-ink flex items-center gap-1">
                            <span>{statusInfo.emoji}</span>
                            <span>#{order.reference}</span>
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: statusInfo.badgeBg,
                              color: statusInfo.badgeText,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="mt-1 text-ink2">
                          {order.address?.recipientName || "Customer"} ·{" "}
                          {order.address?.area || order.address?.district || "Dhaka"}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-ink">৳{order.total}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isRemoved) {
                                setRemovedPinIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(order.id);
                                  return next;
                                });
                              } else {
                                setRemovedPinIds(
                                  (prev) => new Set([...prev, order.id]),
                                );
                              }
                            }}
                            className="text-[10.5px] font-medium text-ink hover:underline"
                          >
                            {isRemoved ? "➕ Show Pin" : "👁️ Hide Pin"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-[12px] text-ink2">
                    No customer orders found.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <div>
            <section
              aria-label="Delivery location map"
              className={`relative overflow-hidden rounded-card border border-line bg-surface shadow-sm transition-all duration-300 ${
                isFullScreen
                  ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none border-none"
                  : "h-[680px]"
              }`}
            >
              <div ref={mapRef} className="z-0 h-full w-full" />

              {/* Floating Full Screen Exit Controls Bar */}
              {isFullScreen && (
                <div className="absolute top-4 right-4 z-[10000] flex items-center gap-2 bg-paper/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-line">
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(false)}
                    className="bg-ink text-white px-4 py-1.5 text-[12px] font-semibold rounded-full hover:bg-black transition-colors flex items-center gap-1.5 shadow"
                  >
                    ✖️ View Normal Form (Exit Fullscreen)
                  </button>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-[13px] text-ink2 font-medium">
                  Loading order map locations…
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

            {/* Bottom View Mode Controls Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-card border border-line">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
                  Display Mode:
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullScreen(false)}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-full border transition-all ${
                    !isFullScreen
                      ? "bg-ink text-white border-ink shadow-sm"
                      : "bg-white text-ink2 border-line hover:border-ink/40"
                  }`}
                >
                  📱 View Normal Form
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullScreen(true)}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-full border transition-all ${
                    isFullScreen
                      ? "bg-ink text-white border-ink shadow-sm"
                      : "bg-white text-ink2 border-line hover:border-ink/40"
                  }`}
                >
                  🖥️ View Full Page Mode
                </button>
              </div>

              <div className="text-[11px] text-ink2">
                {isFullScreen
                  ? "Full screen mode active · Press ESC to return"
                  : "Normal form mode matches dashboard design"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
