export type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  invalidateSize(): void;
  fitBounds(bounds: [number, number][], options: { padding: [number, number] }): void;
};

export interface LeafletLayer {
  addTo(target: LeafletMap | LeafletLayerGroup): this;
}
export type LeafletLayerGroup = LeafletLayer & {
  clearLayers(): void;
};

export type LeafletMarker = LeafletLayer & {
  bindPopup(content: string): LeafletMarker;
  bindTooltip(
    content: string,
    options: { direction: string; offset: [number, number] },
  ): LeafletMarker;
  on(event: string, handler: () => void | Promise<void>): LeafletMarker;
  setPopupContent(content: string): LeafletMarker;
  setTooltipContent(content: string): LeafletMarker;
};

export type LeafletApi = {
  map(element: HTMLElement): LeafletMap;
  tileLayer(
    url: string,
    options: { attribution: string; maxZoom: number },
  ): LeafletLayer;
  layerGroup(): LeafletLayerGroup;
  divIcon(options: {
    html: string;
    className: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }): unknown;
  marker(point: [number, number], options: { icon: unknown }): LeafletMarker;
  polyline(
    points: [number, number][],
    options: {
      color: string;
      weight: number;
      opacity: number;
      dashArray: string;
    },
  ): LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletApi;
    removeOrderPinFromMap?: (orderId: string) => void;
    removeRiderPinFromMap?: (riderId: string) => void;
  }
}
