-- Inventory Items Schema for Barcode Tracking
-- This table tracks individual product items with barcodes and quantities

USE projectX;

-- Drop table if exists
DROP TABLE IF EXISTS InventoryItems;

-- Create InventoryItems table to track products with barcodes
CREATE TABLE InventoryItems (
  itemID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  PRODUCT_ID INT NOT NULL,
  LOT_ID INT NOT NULL,
  barcode VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  manufacturingDate DATE NULL,
  expiryDate DATE NULL,
  batchNumber VARCHAR(255) NULL,
  createdByEmployeeID CHAR(8) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (PRODUCT_ID)
    REFERENCES PRODUCT (PRODUCT_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_lot FOREIGN KEY (LOT_ID)
    REFERENCES LOT (LOT_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_created_by FOREIGN KEY (createdByEmployeeID)
    REFERENCES EmployeeDetails (employeeID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  UNIQUE KEY uniq_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create SalesTransactions table to track sales
CREATE TABLE SalesTransactions (
  transactionID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employeeID CHAR(8) NOT NULL,
  transactionDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_employee FOREIGN KEY (employeeID)
    REFERENCES EmployeeDetails (employeeID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create SalesTransactionItems table to track individual items in a sale
CREATE TABLE SalesTransactionItems (
  transactionItemID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transactionID INT NOT NULL,
  itemID INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unitPrice DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transaction_item_transaction FOREIGN KEY (transactionID)
    REFERENCES SalesTransactions (transactionID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_transaction_item_inventory FOREIGN KEY (itemID)
    REFERENCES InventoryItems (itemID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Index for faster barcode lookups
CREATE INDEX idx_barcode ON InventoryItems(barcode);
CREATE INDEX idx_product_id ON InventoryItems(PRODUCT_ID);
CREATE INDEX idx_inventory_created_by ON InventoryItems(createdByEmployeeID);
CREATE INDEX idx_transaction_date ON SalesTransactions(transactionDate);

