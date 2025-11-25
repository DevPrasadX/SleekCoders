-- Full schema + stored procedure bundle for the Stock Manager app.
-- Run this script on the target MySQL 8+ instance (e.g., AWS RDS).

CREATE DATABASE IF NOT EXISTS projectX CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE projectX;

/* ------------------------------------------------------------------
   TABLE DEFINITIONS
-------------------------------------------------------------------*/

-- Drop tables in FK order to allow repeated runs.
DROP TABLE IF EXISTS LOT;
DROP TABLE IF EXISTS PRODUCT;
DROP TABLE IF EXISTS SUPPLIER;
DROP TABLE IF EXISTS EmployeeDetails;

CREATE TABLE EmployeeDetails (
  employeeID CHAR(8) NOT NULL PRIMARY KEY
    DEFAULT (UPPER(SUBSTR(MD5(RAND()), 1, 8))),
  employeeName VARCHAR(255) NOT NULL,
  employeePhoneNumber VARCHAR(20) NOT NULL,
  employeeEmail VARCHAR(255) NOT NULL,
  employeeAddress VARCHAR(255) NOT NULL,
  employeeRole VARCHAR(100) DEFAULT NULL,
  employeePassword VARCHAR(255) NOT NULL DEFAULT 'ChangeMe123!',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_employee_email (employeeEmail)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE SUPPLIER (
  SUPPLIER_ID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  SUPPLIER_NAME VARCHAR(255) NOT NULL,
  SUPPLIER_DATE_OF_JOINING DATE NOT NULL,
  SUPPLIER_POC VARCHAR(255) NOT NULL,
  SUPPLIER_CONTACT_NUMBER VARCHAR(20) NOT NULL,
  SUPPLIER_PRODUCT_COUNT INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_supplier_name (SUPPLIER_NAME)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE PRODUCT (
  PRODUCT_ID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  PRODUCT_NAME VARCHAR(255) NOT NULL,
  PRODUCT_DESCRIPTION TEXT NULL,
  PRODUCT_STANDARD_PRICE DECIMAL(10,2) NOT NULL,
  PRODUCT_CATEGORY VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_product_name (PRODUCT_NAME)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE LOT (
  LOT_ID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  SUPPLIER_ID INT NOT NULL,
  LOT_NAME VARCHAR(255) NOT NULL,
  LOT_DATE_OF_ARRIVAL DATE NOT NULL,
  LOT_PRODUCT_COUNT INT NOT NULL DEFAULT 0,
  LOT_QUANTITY INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lot_supplier FOREIGN KEY (SUPPLIER_ID)
    REFERENCES SUPPLIER (SUPPLIER_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ------------------------------------------------------------------
   STORED PROCEDURES
-------------------------------------------------------------------*/

DELIMITER //

DROP PROCEDURE IF EXISTS addEmployee //
CREATE PROCEDURE addEmployee(
  IN p_employee_name VARCHAR(255),
  IN p_employee_phone VARCHAR(255),
  IN p_employee_email VARCHAR(255),
  IN p_employee_address VARCHAR(255),
  IN p_employee_role VARCHAR(100),
  IN p_employee_password VARCHAR(255)
)
BEGIN
  INSERT INTO EmployeeDetails(
    employeeName,
    employeePhoneNumber,
    employeeEmail,
    employeeAddress,
    employeeRole,
    employeePassword
  )
  VALUES (
    p_employee_name,
    p_employee_phone,
    p_employee_email,
    p_employee_address,
    p_employee_role,
    p_employee_password
  );
END //

DROP PROCEDURE IF EXISTS updateEmployeeDetails //
CREATE PROCEDURE updateEmployeeDetails(
  IN p_employee_name VARCHAR(255),
  IN p_employee_phone VARCHAR(255),
  IN p_employee_email VARCHAR(255),
  IN p_employee_address VARCHAR(255),
  IN p_employee_role VARCHAR(100),
  IN p_employee_id CHAR(8)
)
BEGIN
  UPDATE EmployeeDetails
  SET
    employeeName = p_employee_name,
    employeePhoneNumber = p_employee_phone,
    employeeEmail = p_employee_email,
    employeeAddress = p_employee_address,
    employeeRole = p_employee_role
  WHERE employeeID = p_employee_id;
END //

DROP PROCEDURE IF EXISTS addSupplierDetails //
CREATE PROCEDURE addSupplierDetails(
  IN p_supplier_name VARCHAR(255),
  IN p_date_of_joining DATE,
  IN p_poc VARCHAR(255),
  IN p_contact_number VARCHAR(255),
  IN p_product_count INT
)
BEGIN
  INSERT INTO SUPPLIER(
    SUPPLIER_NAME,
    SUPPLIER_DATE_OF_JOINING,
    SUPPLIER_POC,
    SUPPLIER_CONTACT_NUMBER,
    SUPPLIER_PRODUCT_COUNT
  )
  VALUES (
    p_supplier_name,
    p_date_of_joining,
    p_poc,
    p_contact_number,
    p_product_count
  );
END //

DROP PROCEDURE IF EXISTS addProductDetails //
CREATE PROCEDURE addProductDetails(
  IN p_product_name VARCHAR(255),
  IN p_description TEXT,
  IN p_standard_price DECIMAL(10, 2),
  IN p_category VARCHAR(255)
)
BEGIN
  INSERT INTO PRODUCT(
    PRODUCT_NAME,
    PRODUCT_DESCRIPTION,
    PRODUCT_STANDARD_PRICE,
    PRODUCT_CATEGORY
  )
  VALUES (
    p_product_name,
    p_description,
    p_standard_price,
    p_category
  );
END //

DROP PROCEDURE IF EXISTS updateEmployeePassword //
CREATE PROCEDURE updateEmployeePassword(
  IN p_employee_id CHAR(8),
  IN p_current_password VARCHAR(255),
  IN p_new_password VARCHAR(255)
)
BEGIN
  UPDATE EmployeeDetails
  SET employeePassword = p_new_password
  WHERE employeeID = p_employee_id AND employeePassword = p_current_password;

  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS addLOTDetails //
CREATE PROCEDURE addLOTDetails(
  IN p_supplier_id INT,
  IN p_lot_name VARCHAR(255),
  IN p_lot_date_of_arrival DATE,
  IN p_lot_product_count INT,
  IN p_lot_quantity INT
)
BEGIN
  INSERT INTO LOT(
    SUPPLIER_ID,
    LOT_NAME,
    LOT_DATE_OF_ARRIVAL,
    LOT_PRODUCT_COUNT,
    LOT_QUANTITY
  )
  VALUES (
    p_supplier_id,
    p_lot_name,
    p_lot_date_of_arrival,
    p_lot_product_count,
    p_lot_quantity
  );
END //

DELIMITER ;

/* ------------------------------------------------------------------
   SEED DATA
-------------------------------------------------------------------*/

INSERT INTO EmployeeDetails (employeeName, employeePhoneNumber, employeeEmail, employeeAddress, employeeRole, employeePassword)
VALUES
  ('John Manager', '+1-555-0100', 'john.manager@example.com', '123 Market St, Springfield', 'Store Manager', 'ChangeMe123!'),
  ('Sarah Clerk', '+1-555-0101', 'sarah.clerk@example.com', '45 Warehouse Ave, Springfield', 'Receiving Clerk', 'ChangeMe123!'),
  ('Mike Cashier', '+1-555-0102', 'mike.cashier@example.com', '89 Front Desk Rd, Springfield', 'Cashier', 'ChangeMe123!');

INSERT INTO SUPPLIER (SUPPLIER_NAME, SUPPLIER_DATE_OF_JOINING, SUPPLIER_POC, SUPPLIER_CONTACT_NUMBER, SUPPLIER_PRODUCT_COUNT)
VALUES
  ('Dairy Delights', '2024-01-05', 'Emma Thompson', '+1-555-0200', 15),
  ('Fresh Farms Co.', '2024-02-12', 'Liam Patel', '+1-555-0201', 22),
  ('Bakery Masters', '2024-03-18', 'Sophia Nguyen', '+1-555-0202', 12),
  ('Meat Market Inc.', '2024-04-02', 'Noah Clark', '+1-555-0203', 18),
  ('Beverage Bros', '2024-05-09', 'Olivia Martinez', '+1-555-0204', 9),
  ('Metro Produce', '2024-06-20', 'Ethan Kim', '+1-555-0205', 20);

INSERT INTO PRODUCT (PRODUCT_NAME, PRODUCT_DESCRIPTION, PRODUCT_STANDARD_PRICE, PRODUCT_CATEGORY)
VALUES
  ('Organic Milk 2L', 'Locally sourced organic whole milk', 5.49, 'Dairy'),
  ('Fresh Strawberries', 'Hand-picked strawberries packed same day', 4.99, 'Produce'),
  ('Greek Yogurt', 'Plain unsweetened yogurt with live cultures', 3.99, 'Dairy'),
  ('Whole Wheat Bread', 'Baked daily artisan wheat loaf', 3.99, 'Bakery'),
  ('Sliced Turkey', 'Premium deli turkey breast', 8.99, 'Meat'),
  ('Orange Juice', 'Cold-pressed orange juice 1L', 4.49, 'Beverages'),
  ('Cheddar Cheese', 'Aged sharp cheddar block', 6.99, 'Dairy'),
  ('Fresh Salmon', 'Atlantic salmon fillets', 12.99, 'Meat');

INSERT INTO LOT (SUPPLIER_ID, LOT_NAME, LOT_DATE_OF_ARRIVAL, LOT_PRODUCT_COUNT, LOT_QUANTITY)
VALUES
  (1, 'LOT-DAIRY-2301', '2025-10-10', 2, 150),
  (2, 'LOT-PROD-2302', '2025-10-12', 3, 200),
  (3, 'LOT-BAKE-2303', '2025-10-11', 1, 120),
  (4, 'LOT-MEAT-2304', '2025-10-09', 2, 80),
  (5, 'LOT-BEV-2305', '2025-10-08', 1, 100),
  (6, 'LOT-PROD-2306', '2025-10-13', 2, 90);

