import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Edit, MapPin, Globe, Phone, Mail, Star, Briefcase } from 'lucide-react';

interface ProviderData {
  business_name: string;
  business_description: string;
  years_in_business: number;
  website: string;
  experience_level: string;
  hourly_rate: number;
  available: boolean;
  profile_completion_percentage: number;
  provider_services: Array<{
    category: string;
    rate_type: string;
    rate_range_min: number | null;
    rate_range_max: number | null;
  }>;
  service_areas: Array<{
    city: string;
    state: string;
    postal_code: string;
    radius_km: number;
  }>;
  provider_portfolio: Array<{
    title: string;
    description: string | null;
    image_url: string;
  }>;
}

interface ProviderProfileViewProps {
  onEdit: () => void;
}

export function ProviderProfileView({ onEdit }: ProviderProfileViewProps) {
  const { user, profile } = useAuthStore();
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          provider_services(*),
          service_areas(*),
          provider_portfolio(*)
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (providerError) throw providerError;
      
      if (!data) {
        setError('No provider profile found. Please complete your profile.');
        setProviderData(null);
        return;
      }

      setProviderData(data);
    } catch (err) {
      console.error('Error loading provider data:', err);
      setError('Failed to load provider profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !providerData) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex flex-col items-center">
          <p className="mb-4">{error || 'Provider profile not found'}</p>
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status and Edit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            providerData.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {providerData.available ? 'Available for work' : 'Not available'}
          </span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Edit className="h-4 w-4 mr-1.5" />
          Edit Profile
        </button>
      </div>

      {/* Profile Completion */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Profile completion</span>
          <span>{providerData.profile_completion_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${providerData.profile_completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
        <div className="space-y-3">
          {profile?.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <a href={`mailto:${profile.email}`} className="hover:text-blue-600">
                {profile.email}
              </a>
            </div>
          )}
          {profile?.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2" />
              <a href={`tel:${profile.phone}`} className="hover:text-blue-600">
                {profile.phone}
              </a>
            </div>
          )}
          {providerData.website && (
            <div className="flex items-center text-sm text-gray-600">
              <Globe className="h-4 w-4 mr-2" />
              <a
                href={providerData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                Website
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Business Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Business Details</h3>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Briefcase className="h-4 w-4 mr-2" />
            <span>{providerData.experience_level || 'Experience not specified'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{profile?.location || 'Location not specified'}</span>
          </div>
        </div>
      </div>

      {/* Service Areas */}
      {providerData.service_areas && providerData.service_areas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Service Areas</h3>
          <div className="space-y-2">
            {providerData.service_areas.map((area, index) => (
              <div key={index} className="text-sm text-gray-600">
                <p className="font-medium">{area.city}, {area.state}</p>
                <p className="text-xs text-gray-500">Within {area.radius_km}km of {area.postal_code}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}