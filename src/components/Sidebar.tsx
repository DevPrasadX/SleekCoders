'use client';

import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userAvatar: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar({ userRole, userName, userAvatar, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    if (userRole === 'Store Manager') {
      return [
        { name: 'Dashboard', path: '/store-manager/dashboard', icon: <DashboardIcon /> },
        { name: 'Stock Inventory', path: '/store-manager/stock-inventory', icon: <InventoryIcon /> },
        { name: 'Expiry Alerts', path: '/store-manager/expiry-alerts', icon: <AlertIcon /> },
        { name: 'Reports & Analytics', path: '/store-manager/reports', icon: <ChartIcon /> },
        { name: 'User Management', path: '/store-manager/users', icon: <UsersIcon /> },
      ];
    } else if (userRole === 'Receiving Clerk') {
      return [
        { name: 'Dashboard', path: '/receiving-clerk/dashboard', icon: <DashboardIcon /> },
        { name: 'Scan & Receive', path: '/receiving-clerk/scan', icon: <ScanIcon /> },
        { name: 'Stock Inventory', path: '/receiving-clerk/stock-inventory', icon: <InventoryIcon /> },
      ];
    } else {
      return [
        { name: 'Dashboard', path: '/cashier/dashboard', icon: <DashboardIcon /> },
        { name: 'POS Integration', path: '/cashier/pos', icon: <POSIcon /> },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className={`fixed left-0 top-0 z-40 h-screen w-64 bg-gray-50 border-r border-gray-200 transform transition-transform duration-200 ease-out 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo + Close on mobile */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-800">SmartStock</div>
            <div className="text-xs text-gray-500">Inventory System</div>
          </div>
        </div>
        <button className="lg:hidden p-2 rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close sidebar">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={onClose}
            >
              <span className="w-5 h-5">{item.icon}</span>
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-semibold text-gray-700">
            {userAvatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 truncate">{userName}</div>
            <div className="text-sm text-gray-500 truncate">{userRole}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function DashboardIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function POSIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

