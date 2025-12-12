export interface EmployeeRecord {
  employeeID: string;
  employeeName: string;
  employeePhoneNumber: string;
  employeeEmail: string;
  employeeAddress: string;
  employeeRole: string | null;
  employeePassword?: string;
}

export interface SupplierRecord {
  SUPPLIER_ID: number;
  SUPPLIER_NAME: string;
  SUPPLIER_DATE_OF_JOINING: string;
  SUPPLIER_POC: string;
  SUPPLIER_CONTACT_NUMBER: string;
  SUPPLIER_PRODUCT_COUNT: number;
}

export interface LotRecord {
  LOT_ID: number;
  SUPPLIER_ID: number;
  LOT_NAME: string;
  LOT_DATE_OF_ARRIVAL: string;
  LOT_PRODUCT_COUNT: number;
  LOT_QUANTITY: number;
}

export interface InventoryItemRecord {
  itemID: number;
  PRODUCT_ID: number;
  LOT_ID: number;
  barcode: string;
  quantity: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  createdByEmployeeID: string;
  createdAt: string;
  updatedAt: string;
}

