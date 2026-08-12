export type DeliveryDistrict = {
  id: string;
  name: string;
  normalizedName: string;
};

export type DeliveryZone = {
  id: string;
  name: string;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  isActive: boolean;
  sortOrder: number;
  districts: DeliveryDistrict[];
  createdAt: string;
  updatedAt: string;
};
