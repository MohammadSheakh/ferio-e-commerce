"use client";

import { useEffect, useRef, useState } from "react";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onSelectLocation: (
    lat: number,
    lng: number,
    addressDetails?: { road: string; suburb: string; city: string; full: string },
  ) => void;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onSelectLocation,
}: LocationPickerModalProps) {
  const defaultLat = initialLat && !isNaN(initialLat) ? initialLat : 23.8103; // Default Dhaka
  const defaultLng = initialLng && !isNaN(initialLng) ? initialLng : 90.4125;

  const [selectedLat, setSelectedLat] = useState<number>(defaultLat);
  const [selectedLng, setSelectedLng] = useState<number>(defaultLng);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoInfo, setGeoInfo] = useState<{
    road: string;
    suburb: string;
    city: string;
    full: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Update internal coordinates when props change
  useEffect(() => {
    if (isOpen) {
      const lat = initialLat && !isNaN(initialLat) ? initialLat : 23.8103;
      const lng = initialLng && !isNaN(initialLng) ? initialLng : 90.4125;
      setSelectedLat(lat);
      setSelectedLng(lng);
      reverseGeocode(lat, lng);
    }
  }, [isOpen, initialLat, initialLng]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
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
        "Dhaka";
      const full = data.display_name || `${road}, ${suburb}, ${city}`;

      setGeoInfo({ road, suburb, city, full });
    } catch {
      setGeoInfo({
        road: "Selected Pinpoint",
        suburb: "Area",
        city: "Dhaka",
        full: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    } finally {
      setGeocoding(false);
    }
  };

  // Dynamically load Leaflet library and initialize map
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    // Load Leaflet CSS if missing
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedLat, selectedLng],
          zoom: 15,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const customPinIcon = L.divIcon({
          html: `<div style="font-size: 26px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">📍</div>`,
          className: "custom-osm-pin",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const marker = L.marker([selectedLat, selectedLng], {
          draggable: true,
          icon: customPinIcon,
        }).addTo(map);

        marker.on("dragend", (e: any) => {
          const coord = e.target.getLatLng();
          setSelectedLat(coord.lat);
          setSelectedLng(coord.lng);
          reverseGeocode(coord.lat, coord.lng);
        });

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedLat(lat);
          setSelectedLng(lng);
          reverseGeocode(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.setView([selectedLat, selectedLng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([selectedLat, selectedLng]);
        }
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    if ((window as any).L) {
      initLeafletMap();
    } else {
      const existingScript = document.getElementById("leaflet-js");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initLeafletMap();
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", initLeafletMap);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map view when internal lat/lng changes via Locate Me
  const updateMapPosition = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    reverseGeocode(lat, lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        updateMapPosition(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        alert(`Could not fetch location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleConfirm = () => {
    onSelectLocation(selectedLat, selectedLng, geoInfo || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-3xl h-[85vh] max-h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-line">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
          <div>
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <span>📍 Pinpoint Delivery Location</span>
            </h3>
            <p className="text-xs text-ink2 mt-0.5">
              Click or drag the red pin on the map to mark your exact location
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink2 hover:bg-black/5 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 w-full bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Quick Action Overlay: Locate Me */}
          <div className="absolute top-4 right-4 z-[400]">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-ink text-xs font-medium rounded-full shadow-md border border-line hover:bg-surface transition-colors"
            >
              {locating ? (
                <span>⏳ Locating...</span>
              ) : (
                <>
                  <span>🎯 Use My Current Location</span>
                </>
              )}
            </button>
          </div>

          {/* Geocoded Address Preview Pill */}
          <div className="absolute bottom-4 left-4 right-4 z-[400]">
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                    Selected Location Pin
                  </span>
                </div>
                <p className="text-xs font-medium text-ink truncate mt-1">
                  {geocoding
                    ? "Fetching location details..."
                    : geoInfo?.full || "Custom pinpoint selected"}
                </p>
                {geoInfo && (
                  <p className="text-[11px] text-ink2 mt-0.5">
                    <strong>Road:</strong> {geoInfo.road} · <strong>Area:</strong> {geoInfo.suburb} · <strong>City:</strong> {geoInfo.city}
                  </p>
                )}
                <p className="text-[10px] text-ink2/70 font-mono mt-0.5">
                  Lat: {selectedLat.toFixed(5)}, Lng: {selectedLng.toFixed(5)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full sm:w-auto px-5 py-2.5 bg-ink text-white font-medium text-xs rounded-xl shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Confirm Location Pin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
