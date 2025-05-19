import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Star,
  MapPin,
  Clock,
  Briefcase,
  Globe,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

interface ProviderDetails {
  id: string;
  business_name: string;
  business_description: string;
  years_in_business: number;
  website: string;
  experience_level: string;
  average_rating?: number;
  total_reviews?: number;
  hourly_rate: number;
  available: boolean;
  profile: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
  } | null;
  services: {
    category: string;
    rate_type: string;
    rate_range_min: number;
    rate_range_max: number;
  }[];
  portfolio: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    category: string;
  }[];
  service_areas: {
    city: string;
    state: string;
    postal_code: string;
    radius_km: number;
  }[];
}

export function ProviderDetails() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviderDetails();
  }, [id]);

  const loadProviderDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: providerError } = await supabase
        .from('provider_profiles')
        .select(`
          *,
          profile:profiles(*),
          services:provider_services(*),
          portfolio:provider_portfolio(*),
          service_areas(*)
        `)
        .eq('id', id)
        .single();

      if (providerError) throw providerError;
      if (!data) throw new Error('Provider not found');

      setProvider(data);
    } catch (err) {
      console.error('Error loading provider details:', err);
      setError('Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 rounded-lg p-4 text-red-700">
          {error || 'Provider not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {provider.business_name}
              </h1>
              <div className="mt-2 flex items-center">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="ml-1 text-gray-600">
                  {provider.average_rating ? provider.average_rating.toFixed(1) : 'Not rated'}
                </span>
                <span className="text-gray-400 ml-1">
                  ({provider.total_reviews || 0} reviews)
                </span>
                <span className="mx-2">•</span>
                <span className={`${provider.available ? 'text-green-600' : 'text-red-600'}`}>
                  {provider.available ? 'Available for work' : 'Currently unavailable'}
                </span>
              </div>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Contact Provider
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 sm:p-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section>
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {provider.business_description}
              </p>
            </section>

            {/* Services */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Services</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {provider.services.map((service, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">{service.category}</h3>
                    <p className="text-gray-600 mt-1">
                      {service.rate_type === 'hourly' && (
                        <>Hourly rate: ${service.rate_range_min}/hr</>
                      )}
                      {service.rate_type === 'fixed' && (
                        <>Fixed rate: ${service.rate_range_min}</>
                      )}
                      {service.rate_type === 'quote' && 'Quote based'}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Portfolio */}
            {provider.portfolio.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Portfolio</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {provider.portfolio.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                    >
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-medium">{item.title}</h3>
                          {item.description && (
                            <p className="text-white/80 text-sm mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="space-y-3">
                {provider.profile?.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-5 w-5 mr-2" />
                    <a href={`mailto:${provider.profile.email}`} className="hover:text-blue-600">
                      {provider.profile.email}
                    </a>
                  </div>
                )}
                {provider.profile?.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-5 w-5 mr-2" />
                    <a href={`tel:${provider.profile.phone}`} className="hover:text-blue-600">
                      {provider.profile.phone}
                    </a>
                  </div>
                )}
                {provider.website && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="h-5 w-5 mr-2" />
                    <a
                      href={provider.website}
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
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Business Details</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Briefcase className="h-5 w-5 mr-2" />
                  <span>{provider.experience_level}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>{provider.years_in_business} years in business</span>
                </div>
                {provider.profile?.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{provider.profile.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Areas */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Service Areas</h2>
              <div className="space-y-2">
                {provider.service_areas.map((area, index) => (
                  <div key={index} className="text-gray-600">
                    <p className="font-medium">{area.city}, {area.state}</p>
                    <p className="text-sm">Within {area.radius_km}km of {area.postal_code}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}