import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Settings, User, FileText, Bell, Menu, X, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function DashboardNavigation() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const isProvider = profile?.user_type === 'provider';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: User,
      href: '/dashboard',
    },
    {
      label: isProvider ? 'Project Requests' : 'Find Providers',
      icon: Search,
      href: isProvider ? '/provider-dashboard' : '/find-provider',
    },
    {
      label: 'My Projects',
      icon: FileText,
      href: '/projects',
    },
    ...(isProvider ? [
      {
        label: 'Provider Profile',
        icon: Briefcase,
        href: '/provider-profile',
      }
    ] : []),
    {
      label: 'Notifications',
      icon: Bell,
      href: '/notifications',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
    },
  ];

  const NavLinks = () => (
    <ul className="space-y-2">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors
                ${isActive 
                  ? 'text-blue-600 bg-blue-50 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 overflow-y-auto">
            <div className="p-6">
              <NavLinks />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden lg:block w-64 bg-white shadow-sm h-[calc(100vh-4rem)] fixed">
        <nav className="mt-8 px-4">
          <NavLinks />
        </nav>
      </div>
    </>
  );
}