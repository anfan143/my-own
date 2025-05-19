import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import type { Profile } from '../types/supabase';

interface DashboardHeaderProps {
  profile: Profile;
  actionButton?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
}

export function DashboardHeader({ profile, actionButton }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-4 sm:p-6 rounded-lg shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome back, {profile.name || profile.email}!
        </h1>
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-sm font-medium text-blue-700">
          {profile.user_type === 'provider' ? 'Service Provider' : 'Customer'}
        </div>
      </div>
      
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <RoleSwitcher />
        {actionButton && (
          <Link
            to={actionButton.href}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {actionButton.icon || <PlusCircle className="h-5 w-5 mr-2" />}
            {actionButton.label}
          </Link>
        )}
      </div>
    </div>
  );
}