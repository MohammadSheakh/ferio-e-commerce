"use client";

import { useEffect, useRef, useState } from "react";

interface MiniAddressMapProps {
  lat: number;
  lng: number;
  label?: string;
  height?: string;
  customText?: string;
  useGeocodedText?: boolean;
  onChangePin?: () => void;
  onClearPin?: () => void;
  onToggleAddressSource?: (useGeocoded: boolean) => void;
}

export default function MiniAddressMap({
  lat,
  lng,
  label = "Delivery Address Pinpoint",
  height = "170px",
  customText,
  useGeocodedText = false,
  onChangePin,
  onClearPin,
  onToggleAddressSource,
}: MiniAddressMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [geoInfo, setGeoInfo] = useState<string>("");
  const [showGeocoded, setShowGeocoded] = useState<boolean>(useGeocodedText);

  // Sync internal state when prop changes
  useEffect(() => {
    setShowGeocoded(useGeocodedText);
  }, [useGeocodedText]);

  useEffect(() => {
    let isMounted = true;
    async function fetchGeo() {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { "Accept-Language": "en" } },
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.neighbourhood || "";
          const suburb = addr.suburb || addr.residential || addr.village || "";
          const city = addr.city || addr.district || "Dhaka";
          const formatted = [road, suburb, city].filter(Boolean).join(", ");
          setGeoInfo(formatted || data.display_name || "");
        }
      } catch {}
    }
    void fetchGeo();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  useEffect(() => {
    if (typeof window === "undefined" || !lat || !lng) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMiniMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          touchZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customPinIcon = L.divIcon({
          html: `<div style="font-size: 24px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); font-weight: bold;">📍</div>`,
          className: "custom-mini-pin",
          iconSize: [26, 26],
          iconAnchor: [13, 26],
        });

        const marker = L.marker([lat, lng], { icon: customPinIcon }).addTo(map);

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.setView([lat, lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    };

    if ((window as any).L) {
      initMiniMap();
    } else {
      const existingScript = document.getElementById("leaflet-js");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMiniMap();
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", initMiniMap);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  const handleToggle = (checked: boolean) => {
    setShowGeocoded(checked);
    if (onToggleAddressSource) {
      onToggleAddressSource(checked);
    }
  };

  const displayText = showGeocoded
    ? geoInfo || "Map Geocoded Address"
    : customText || geoInfo || "Typed Address";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col gap-2 p-3 bg-white border-b border-line text-xs">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-rose-500 font-semibold text-sm shrink-0">📍</span>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-[12px] truncate">{label}</p>
              <p className="text-[11.5px] text-ink font-medium truncate mt-0.5">
                {displayText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onChangePin && (
              <button
                type="button"
                onClick={onChangePin}
                className="px-2.5 py-1 text-[11px] font-semibold text-ink bg-surface hover:bg-slate-100 rounded-lg border border-line transition-colors"
              >
                Adjust Pin
              </button>
            )}
            {onClearPin && (
              <button
                type="button"
                onClick={onClearPin}
                className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Address source selection toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px]">
          <span className="text-ink2 font-medium">Text Display Source:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-ink hover:text-black">
            <input
              type="checkbox"
              checked={showGeocoded}
              onChange={(e) => handleToggle(e.target.checked)}
              className="rounded border-line text-ink focus:ring-0"
            />
            <span className="text-[10.5px]">
              {showGeocoded ? "Map Name (OSM)" : "Customer Typed Address"}
            </span>
          </label>
        </div>
      </div>

      {/* Embedded Map Container */}
      <div
        onClick={onChangePin}
        className={`relative w-full bg-slate-100 ${onChangePin ? "cursor-pointer group" : ""}`}
        style={{ height }}
      >
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Hover overlay hint */}
        {onChangePin && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg transition-opacity pointer-events-none">
              Click to reposition on full map 🗺️
            </span>
          </div>
        )}

        {/* Lat/Lng pill footer */}
        <div className="absolute bottom-2 right-2 z-10 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md border border-line shadow-xs font-mono text-[9.5px] text-ink2">
          Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
