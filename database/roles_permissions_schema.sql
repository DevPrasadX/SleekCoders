-- Role and Permission Management Schema
-- Run this script to add role-based access control (RBAC) functionality

USE projectX;

-- Drop tables in FK order
DROP TABLE IF EXISTS RolePermissions;
DROP TABLE IF EXISTS Roles;

-- Create Roles table
CREATE TABLE Roles (
  roleID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  roleName VARCHAR(100) NOT NULL,
  roleDescription TEXT NULL,
  isSystemRole BOOLEAN DEFAULT FALSE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_name (roleName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create RolePermissions table (maps roles to routes/pages)
CREATE TABLE RolePermissions (
  permissionID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  roleID INT NOT NULL,
  routePath VARCHAR(255) NOT NULL,
  routeName VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_permission_role FOREIGN KEY (roleID)
    REFERENCES Roles (roleID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uniq_role_route (roleID, routePath)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default system roles with their permissions
INSERT INTO Roles (roleName, roleDescription, isSystemRole) VALUES
  ('Store Manager', 'Full access to all system features including role management', TRUE),
  ('Receiving Clerk', 'Access to receiving and inventory management', TRUE),
  ('Cashier', 'Access to POS and basic inventory viewing', TRUE);

-- Get role IDs for permissions (MySQL doesn't support RETURNING, so we use a workaround)
SET @store_manager_id = (SELECT roleID FROM Roles WHERE roleName = 'Store Manager');
SET @receiving_clerk_id = (SELECT roleID FROM Roles WHERE roleName = 'Receiving Clerk');
SET @cashier_id = (SELECT roleID FROM Roles WHERE roleName = 'Cashier');

-- Store Manager permissions (all routes)
INSERT INTO RolePermissions (roleID, routePath, routeName) VALUES
  (@store_manager_id, '/store-manager/dashboard', 'Store Manager Dashboard'),
  (@store_manager_id, '/store-manager/stock-inventory', 'Stock Inventory'),
  (@store_manager_id, '/store-manager/expiry-alerts', 'Expiry Alerts'),
  (@store_manager_id, '/store-manager/reports', 'Reports & Analytics'),
  (@store-manager_id, '/store-manager/users', 'User Management'),
  (@store_manager_id, '/store-manager/roles', 'Role Management');

-- Receiving Clerk permissions
INSERT INTO RolePermissions (roleID, routePath, routeName) VALUES
  (@receiving_clerk_id, '/receiving-clerk/dashboard', 'Receiving Clerk Dashboard'),
  (@receiving_clerk_id, '/receiving-clerk/scan', 'Scan & Receive'),
  (@receiving_clerk_id, '/receiving-clerk/stock-inventory', 'Stock Inventory');

-- Cashier permissions
INSERT INTO RolePermissions (roleID, routePath, routeName) VALUES
  (@cashier_id, '/cashier/dashboard', 'Cashier Dashboard'),
  (@cashier_id, '/cashier/pos', 'POS Integration');

