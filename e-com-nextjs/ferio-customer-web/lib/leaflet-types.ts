export type LeafletLatLng = { lat: number; lng: number };

export type LeafletEvent = {
  target: { getLatLng(): LeafletLatLng };
  latlng: LeafletLatLng;
};

export interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  invalidateSize(): void;
  remove(): void;
  on(event: string, handler: (event: LeafletEvent) => void): LeafletMap;
}

export interface LeafletLayer {
  addTo(target: LeafletMap): this;
}

export interface LeafletMarker extends LeafletLayer {
  setLatLng(point: [number, number]): LeafletMarker;
  on(event: string, handler: (event: LeafletEvent) => void): LeafletMarker;
}

export type LeafletApi = {
  map(
    element: HTMLElement,
    options?: Record<string, unknown>,
  ): LeafletMap;
  tileLayer(
    url: string,
    options: { attribution?: string; maxZoom?: number },
  ): LeafletLayer;
  divIcon(options: {
    html: string;
    className: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }): unknown;
  marker(
    point: [number, number],
    options: { icon: unknown; draggable?: boolean },
  ): LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletApi;
  }
}
