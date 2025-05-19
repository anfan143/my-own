import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin, Clock, Briefcase, Globe, Phone, Mail, Calendar } from 'lucide-react';
import type { ServiceCategory } from '../types/supabase';
import toast from 'react-hot-toast';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'General Renovation',
  'Kitchen Remodeling',
  'Bathroom Remodeling',
  'Room Addition',
  'Outdoor Space',
  'Roofing',
  'Electrical Work',
  'Plumbing',
  'Flooring',
  'Painting',
  'Windows and Doors',
  'HVAC',
  'Other',
];

interface Provider {
  id: string;
  business_name: string;
  business_description: string;
  years_in_business: number;
  website: string;
  available: boolean;
  profile: {
    id: string;
    name: string;
    email: string;
    location: string;
  } | null;
  services: {
    service_category: string;
    rate_type: string;
    rate_range_min: number;
    rate_range_max: number;
  }[];
  service_areas: {
    city: string;
    state: string;
    postal_code: string;
    radius_km: number;
  }[];
  portfolio: {
    id: string;
    image_url: string;
    title: string;
  }[];
}

interface SearchFilters {
  category: string;
  location: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function FindProvider() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    location: '',
    sortBy: 'rate_range_min',
    sortOrder: 'asc'
  });

  useEffect(() => {
    loadProviders();
  }, [filters]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('provider_profiles')
        .select(`
          id,
          business_name,
          business_description,
          available,
          years_in_business,
          website,
          profile:profiles!provider_profiles_id_fkey(
            id,
            name,
            email,
            location
          ),
          services:provider_services(
            service_category,
            rate_type,
            rate_range_min,
            rate_range_max
          ),
          service_areas(
            city,
            state,
            postal_code,
            radius_km
          ),
          portfolio:provider_portfolio(
            id,
            title,
            image_url
          )
        `)
        .eq('available', true);

      // Apply category filter
      if (filters.category) {
        const { data: serviceProviders } = await supabase
          .from('provider_services')
          .select('provider_id')
          .eq('service_category', filters.category);

        if (serviceProviders?.length) {
          query = query.in('id', serviceProviders.map(p => p.provider_id));
        } else {
          setProviders([]);
          setLoading(false);
          return;
        }
      }

      // Apply location filter
      if (filters.location) {
        const locationSearch = filters.location.toLowerCase();
        const { data: locationResults } = await supabase
          .from('service_areas')
          .select('provider_id, city, state, postal_code')
          .or(`city.ilike.%${locationSearch}%,state.ilike.%${locationSearch}%,postal_code.ilike.%${locationSearch}%`);

        if (locationResults?.length) {
          query = query.in('id', locationResults.map(l => l.provider_id));
        } else {
          setProviders([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort providers
      let sortedProviders = [...(data || [])];
      
      switch (filters.sortBy) {
        case 'rate_range_min':
          sortedProviders.sort((a, b) => {
            const aMin = Math.min(...(a.services?.map(s => s.rate_range_min || 0) || [0]));
            const bMin = Math.min(...(b.services?.map(s => s.rate_range_min || 0) || [0]));
            return filters.sortOrder === 'asc' ? aMin - bMin : bMin - aMin;
          });
          break;
        case 'business_name':
          sortedProviders.sort((a, b) => {
            return filters.sortOrder === 'asc'
              ? (a.business_name || '').localeCompare(b.business_name || '')
              : (b.business_name || '').localeCompare(a.business_name || '');
          });
          break;
      }

      setProviders(sortedProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const getLowestRate = (provider: Provider) => {
    if (!provider.services?.length) return null;
    
    const rates = provider.services
      .filter(s => s.rate_type !== 'quote' && s.rate_range_min > 0)
      .map(s => s.rate_range_min);
    
    return rates.length > 0 ? Math.min(...rates) : null;
  };

  const formatServiceAreas = (areas: Provider['service_areas']) => {
    if (!areas?.length) return 'Service area not specified';

    if (areas.length === 1) {
      return `${areas[0].city}, ${areas[0].state}`;
    }

    const primaryArea = `${areas[0].city}, ${areas[0].state}`;
    return `${primaryArea} +${areas.length - 1} more ${areas.length === 2 ? 'area' : 'areas'}`;
  };

  const getServiceAreaTooltip = (areas: Provider['service_areas']) => {
    if (!areas?.length) return '';
    return areas.map(area => `${area.city}, ${area.state} (${area.radius_km}km radius)`).join('\n');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Category
              </label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter city or state"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters(prev => ({
                    ...prev,
                    sortBy,
                    sortOrder: sortOrder as 'asc' | 'desc'
                  }));
                }}
              >
                <option value="rate_range_min-asc">Lowest Rate</option>
                <option value="rate_range_min-desc">Highest Rate</option>
                <option value="business_name-asc">Business Name (A-Z)</option>
                <option value="business_name-desc">Business Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Available Providers</h1>
            <p className="text-gray-600">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : providers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">No providers found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {providers.map((provider) => (
                <Link
                  key={provider.id}
                  to={`/provider/${provider.id}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {provider.portfolio?.[0] && (
                    <div className="aspect-video relative">
                      <img
                        src={provider.portfolio[0].image_url}
                        alt={provider.portfolio[0].title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="absolute bottom-4 left-4 right-4">
                          <h2 className="text-xl font-semibold text-white">
                            {provider.business_name}
                          </h2>
                          <div className="flex items-center text-white/90 text-sm mt-1">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{formatServiceAreas(provider.service_areas)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    {!provider.portfolio?.[0] && (
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {provider.business_name}
                      </h2>
                    )}
                    
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {provider.business_description}
                    </p>

                    <div className="mt-4 space-y-2">
                      <div 
                        className="flex items-center text-gray-600"
                        title={getServiceAreaTooltip(provider.service_areas)}
                      >
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {formatServiceAreas(provider.service_areas)}
                        </span>
                      </div>
                      
                      {provider.services?.length > 0 && (
                        <div className="flex items-center text-gray-600">
                          <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {provider.services.map(s => s.service_category).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {provider.available ? 'Available for work' : 'Currently unavailable'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Starting from</span>
                        {getLowestRate(provider) ? (
                          <span className="text-lg font-semibold text-blue-600">
                            ${getLowestRate(provider)}/hr
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Quote based</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}