import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProfileCompletionForm } from './ProfileCompletionForm';
import { supabase } from '../lib/supabase';

export function RoleSwitcher() {
  const navigate = useNavigate();
  const { profile, loading, switchRole } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

  const handleSwitch = async () => {
    if (isSwitching || !profile || isCompletingProfile) return;

    try {
      setIsSwitching(true);

      // If switching to provider and profile is incomplete, show completion form
      if (profile.user_type === 'customer' && 
          (!profile.name || !profile.email || !profile.phone || !profile.location)) {
        setIsCompletingProfile(true);
        setShowCompletionForm(true);
        return;
      }

      const { redirectTo } = await switchRole();
      
      if (redirectTo) {
        if (redirectTo === '/provider-profile') {
          toast.error('Please complete your provider profile to continue');
        }
        navigate(redirectTo);
      }
    } catch (error: any) {
      console.error('Role switch error:', error);
      if (error.message.includes('Provider profile data is incomplete')) {
        navigate('/provider-profile');
        toast.error('Please complete your provider profile to continue');
      } else {
        toast.error(error.message || 'Failed to switch roles');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCompletionSuccess = async () => {
    setShowCompletionForm(false);
    setIsCompletingProfile(false);
    await handleSwitch();
  };

  const handleCompletionCancel = () => {
    setShowCompletionForm(false);
    setIsCompletingProfile(false);
  };

  if (!profile || loading) return null;

  if (showCompletionForm) {
    return (
      <ProfileCompletionForm
        userType={profile.user_type === 'customer' ? 'provider' : 'customer'}
        onComplete={handleCompletionSuccess}
        onCancel={handleCompletionCancel}
      />
    );
  }

  const isDisabled = loading || isSwitching;

  return (
    <div className="relative">
      <button
        onClick={handleSwitch}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isDisabled}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserCog className="h-5 w-5 mr-2" />
        Switch to {profile.user_type === 'customer' ? 'Provider' : 'Customer'}
      </button>

      {isHovered && !isDisabled && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg whitespace-nowrap">
          Switch to {profile.user_type === 'customer' ? 'Provider' : 'Customer'} mode
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      )}
    </div>
  );
}