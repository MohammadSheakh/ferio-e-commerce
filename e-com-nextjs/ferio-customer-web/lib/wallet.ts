export type WalletTransaction = {
  id: string;
  type: 'debit' | 'credit' | 'withdrawal';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  referenceFor: string;
  orderId: string | null;
  topUpId: string | null;
  createdAt: string;
};

export type WalletTopUp = {
  id: string;
  provider: 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER';
  amount: number;
  status: 'PENDING_REVIEW' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  customerReference: string;
  customerNote: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
};

export type WalletSummary = {
  wallet: {
    id: string;
    balance: number;
    totalCredited: number;
    currency: 'BDT';
    status: 'active' | 'frozen' | 'suspended';
  };
  transactions: WalletTransaction[];
  topUps: WalletTopUp[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
