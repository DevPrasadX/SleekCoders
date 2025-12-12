'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { User } from '@/types';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user');
      router.push('/login');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar and mobile overlay */}
      <Sidebar userRole={user.role} userName={user.userName} userAvatar={user.avatar} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Header 
        userName={user.userName} 
        userAvatar={user.avatar} 
        onMenuClick={() => setIsSidebarOpen(prev => !prev)}
        onLogout={handleLogout}
      />

      <main className="pt-16 p-4 sm:p-6 lg:ml-64">
        {children}
      </main>
    </div>
  );
}

