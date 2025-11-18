'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';
import { users } from '@/data/staticData';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roles: UserRole[] = ['Store Manager', 'Receiving Clerk', 'Cashier'];

  const handleLogin = () => {
    const user = users.find(
      (u) => u.userName.toLowerCase().includes(email.toLowerCase()) && password === 'pass'
    );
    
    if (user && role === user.role) {
      // Store user in sessionStorage
      sessionStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role
      if (role === 'Store Manager') {
        router.push('/store-manager/dashboard');
      } else if (role === 'Receiving Clerk') {
        router.push('/receiving-clerk/dashboard');
      } else if (role === 'Cashier') {
        router.push('/cashier/dashboard');
      }
    } else {
      alert('Invalid credentials or role mismatch');
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  {roles.map((r) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

