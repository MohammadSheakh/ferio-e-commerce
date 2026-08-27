export type OrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PACKED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type Order = {
  id: string;
  customer: string;
  phone: string;
  area: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: OrderStatus;
  paymentMethod: "COD" | "Prepaid";
  placedAt: string;
  courier?: string;
};

export const orders: Order[] = [
  {
    id: "FR-10231",
    customer: "Rahim Uddin",
    phone: "01711-223344",
    area: "Mirpur, Dhaka",
    items: [{ name: "Handloom Cotton Panjabi", qty: 1, price: 1450 }],
    total: 1520,
    status: "PENDING_CONFIRMATION",
    paymentMethod: "COD",
    placedAt: "2026-08-04 09:12",
  },
  {
    id: "FR-10230",
    customer: "Nusrat Jahan",
    phone: "01911-556677",
    area: "Gulshan, Dhaka",
    items: [{ name: "Jamdani-Inspired Saree", qty: 1, price: 2650 }],
    total: 2720,
    status: "CONFIRMED",
    paymentMethod: "COD",
    placedAt: "2026-08-03 18:44",
  },
  {
    id: "FR-10229",
    customer: "Kamal Hossain",
    phone: "01611-889900",
    area: "Chattogram",
    items: [
      { name: "Brass Tea Set (6-piece)", qty: 1, price: 1890 },
      { name: "Nakshi Kantha Throw", qty: 1, price: 2350 },
    ],
    total: 4310,
    status: "IN_TRANSIT",
    paymentMethod: "COD",
    placedAt: "2026-08-02 11:03",
    courier: "Pathao Courier",
  },
  {
    id: "FR-10228",
    customer: "Sadia Islam",
    phone: "01511-334455",
    area: "Sylhet",
    items: [{ name: "Kids Eid Panjabi Set", qty: 2, price: 980 }],
    total: 2030,
    status: "DELIVERED",
    paymentMethod: "COD",
    placedAt: "2026-07-30 15:20",
    courier: "Steadfast",
  },
  {
    id: "FR-10227",
    customer: "Tariqul Islam",
    phone: "01311-667788",
    area: "Uttara, Dhaka",
    items: [{ name: "Leather Nagra Sandal", qty: 1, price: 1150 }],
    total: 1220,
    status: "RETURNED",
    paymentMethod: "COD",
    placedAt: "2026-07-28 10:05",
    courier: "Pathao Courier",
  },
  {
    id: "FR-10226",
    customer: "Farhana Akter",
    phone: "01811-990011",
    area: "Rajshahi",
    items: [{ name: "Nakshi Kantha Throw", qty: 1, price: 2350 }],
    total: 2420,
    status: "CANCELLED",
    paymentMethod: "COD",
    placedAt: "2026-07-27 08:30",
  },
];

export type Customer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string;
  segment: "New" | "Repeat" | "VIP" | "At risk";
};

export const customers: Customer[] = [
  { id: "c1", name: "Rahim Uddin", phone: "01711-223344", orders: 1, totalSpent: 1520, lastOrder: "2026-08-04", segment: "New" },
  { id: "c2", name: "Nusrat Jahan", phone: "01911-556677", orders: 5, totalSpent: 12400, lastOrder: "2026-08-03", segment: "VIP" },
  { id: "c3", name: "Kamal Hossain", phone: "01611-889900", orders: 3, totalSpent: 9800, lastOrder: "2026-08-02", segment: "Repeat" },
  { id: "c4", name: "Sadia Islam", phone: "01511-334455", orders: 2, totalSpent: 3200, lastOrder: "2026-07-30", segment: "Repeat" },
  { id: "c5", name: "Tariqul Islam", phone: "01311-667788", orders: 4, totalSpent: 6100, lastOrder: "2026-05-12", segment: "At risk" },
];

export const kpis = {
  revenueToday: 42300,
  ordersToday: 18,
  pendingConfirmation: orders.filter((o) => o.status === "PENDING_CONFIRMATION").length,
  codSuccessRate: 0.82,
  deliveredThisMonth: 214,
  rtoRate: 0.11,
};
