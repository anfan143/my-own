import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogIn, LogOut, UserPlus, Search, User, Hammer } from 'lucide-react';

export function Navigation() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Hammer className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Remeselnik</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/find-provider"
              className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              <Search className="h-4 w-4" />
              <span>Find Provider</span>
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span>{profile?.name || profile?.email || 'Profile'}</span>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowProfileMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}