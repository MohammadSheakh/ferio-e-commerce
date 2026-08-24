export type CustomerNotification = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  linkFor: string | null;
  linkId: string | null;
  data: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type CustomerNotificationPage = {
  items: CustomerNotification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unread: number;
};
