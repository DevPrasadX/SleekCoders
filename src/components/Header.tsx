'use client';

interface HeaderProps {
  userName: string;
  userAvatar: string;
  notifications?: number;
  onMenuClick?: () => void;
}

export default function Header({ userName, userAvatar, notifications = 3, onMenuClick }: HeaderProps) {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:ml-64">
      {/* Left: Hamburger on mobile */}
      <div className="flex items-center">
        <button
          aria-label="Open sidebar"
          onClick={onMenuClick}
          className="lg:hidden mr-3 p-2 rounded-md border border-gray-200 hover:bg-gray-50"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center space-x-4 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notifications}
            </span>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-semibold text-gray-700">
            {userAvatar}
          </div>
          <div className="hidden md:block">
            <div className="font-medium text-gray-800">{userName}</div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

