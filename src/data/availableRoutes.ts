/**
 * Available routes/pages that can be assigned as permissions to roles
 */
export interface Route {
  path: string;
  name: string;
  category: string;
}

export const AVAILABLE_ROUTES: Route[] = [
  // Store Manager routes
  {
    path: '/store-manager/dashboard',
    name: 'Store Manager Dashboard',
    category: 'Store Manager',
  },
  {
    path: '/store-manager/stock-inventory',
    name: 'Stock Inventory',
    category: 'Store Manager',
  },
  {
    path: '/store-manager/expiry-alerts',
    name: 'Expiry Alerts',
    category: 'Store Manager',
  },
  {
    path: '/store-manager/reports',
    name: 'Reports & Analytics',
    category: 'Store Manager',
  },
  {
    path: '/store-manager/users',
    name: 'User Management',
    category: 'Store Manager',
  },
  {
    path: '/store-manager/roles',
    name: 'Role Management',
    category: 'Store Manager',
  },
  // Receiving Clerk routes
  {
    path: '/receiving-clerk/dashboard',
    name: 'Receiving Clerk Dashboard',
    category: 'Receiving Clerk',
  },
  {
    path: '/receiving-clerk/scan',
    name: 'Scan & Receive',
    category: 'Receiving Clerk',
  },
  {
    path: '/receiving-clerk/stock-inventory',
    name: 'Stock Inventory',
    category: 'Receiving Clerk',
  },
  // Cashier routes
  {
    path: '/cashier/dashboard',
    name: 'Cashier Dashboard',
    category: 'Cashier',
  },
  {
    path: '/cashier/pos',
    name: 'POS Integration',
    category: 'Cashier',
  },
  // Shared routes
  {
    path: '/profile',
    name: 'Profile',
    category: 'Shared',
  },
];

export const getRoutesByCategory = () => {
  const categories: Record<string, Route[]> = {};
  AVAILABLE_ROUTES.forEach((route) => {
    if (!categories[route.category]) {
      categories[route.category] = [];
    }
    categories[route.category].push(route);
  });
  return categories;
};

