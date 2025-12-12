'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch roles from API
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles/list');
        if (response.ok) {
          const roleNames = await response.json();
          setRoles(roleNames);
        } else {
          // Fallback to default roles if API fails
          setRoles(['Store Manager', 'Receiving Clerk', 'Cashier']);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        // Fallback to default roles
        setRoles(['Store Manager', 'Receiving Clerk', 'Cashier']);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  const handleLogin = async () => {
    if (!role) {
      setErrorMessage('Please select a role');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Login failed');
      }

      const user = await response.json();

      sessionStorage.setItem(
        'user',
        JSON.stringify({
          userId: user.employeeID,
          userName: user.employeeName,
          role: user.employeeRole,
          email: user.employeeEmail,
        }),
      );

      // Get dashboard route for this role dynamically
      try {
        const dashboardResponse = await fetch('/api/roles/dashboards');
        if (dashboardResponse.ok) {
          const roleDashboards: Record<string, string> = await dashboardResponse.json();
          const dashboardRoute = roleDashboards[user.employeeRole];
          
          if (dashboardRoute) {
            router.push(dashboardRoute);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard route:', err);
      }

      // Fallback to hardcoded routes if API fails
      const roleLower = role.toLowerCase();
      if (roleLower.includes('manager')) {
        router.push('/store-manager/dashboard');
      } else if (roleLower.includes('clerk')) {
        router.push('/receiving-clerk/dashboard');
      } else if (roleLower.includes('cashier')) {
        router.push('/cashier/dashboard');
      } else {
        // Default to store manager if role not recognized
        router.push('/store-manager/dashboard');
      }
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SmartStock System</h1>
          <p className="text-sm text-gray-500 mt-1">Supermarket Inventory Management Platform</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <span className={role ? 'text-gray-900' : 'text-gray-400'}>
                  {role || 'Select role'}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRoleDropdown && (
                <div ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingRoles ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Loading roles...</div>
                  ) : roles.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No roles available</div>
                  ) : (
                    roles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRole(r);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                          role === r ? 'bg-blue-50' : ''
                        }`}
                      >
                        {r}
                        {role === r && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm rounded-lg">
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

