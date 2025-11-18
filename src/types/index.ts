export type UserRole = 'Store Manager' | 'Receiving Clerk' | 'Cashier';

export interface User {
  userId: string;
  userName: string;
  password: string;
  role: UserRole;
  avatar: string;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  standardPrice: number;
  category: string;
}

export interface StockItem {
  stockItemId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  supplier: string;
  category: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
  daysToExpiry: number;
  status: 'Fresh' | 'Near Expiry' | 'Expired';
}

export interface Shipment {
  shipmentId: string;
  supplier: string;
  receivedDate: string;
  status: 'Processed' | 'Pending';
  items: StockItem[];
  itemCount: number;
}

export interface ExpiryAlert {
  alertId: string;
  stockItemId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  priority: 'Critical' | 'High Priority' | 'Medium Priority';
  currentPrice: number;
  suggestedDiscount: number;
  category: string;
}

export interface SaleTransaction {
  transactionId: string;
  transactionDate: string;
  product: string;
  batch: string;
  quantity: number;
  price: number;
  stockBefore: number;
  stockAfter: number;
  cashier: string;
}

export interface WasteReport {
  reportId: string;
  generationDate: string;
  reportPeriod: string;
  totalWaste: number;
  wasteCost: number;
  itemsSaved: number;
  recoveryRate: number;
}

export interface ScannedProduct {
  productName: string;
  batchNumber: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
}

