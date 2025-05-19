import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ServiceCategory } from '../types/supabase';

function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // Check if it's a social media profile
  const socialPatterns = {
    facebook: /(?:facebook\.com|fb\.com)\/([^/]+)/,
    instagram: /instagram\.com\/([^/]+)/,
    linkedin: /linkedin\.com\/(?:in|company)\/([^/]+)/,
    twitter: /twitter\.com\/([^/]+)/,
  };

  // If it's already a valid URL, return as is
  try {
    new URL(url);
    return url;
  } catch {
    // Check if it matches a social media pattern
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      if (pattern.test(url)) {
        return `https://${url}`;
      }
    }

    // If it's a plain domain or path, add https://
    if (url.includes('.') || url.startsWith('@')) {
      return `https://${url.startsWith('www.') ? '' : 'www.'}${url}`;
    }

    return url;
  }
}

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
  'Other'
];

interface FormData {
  business_name: string;
  business_description: string;
  years_in_business: number;
  website: string;
  available: boolean;
  services: Array<{
    category: ServiceCategory;
    rate_type: 'hourly' | 'fixed' | 'quote';
    rate_range_min: number;
    rate_range_max: number;
  }>;
  service_areas: Array<{
    city: string;
    state: string;
    postal_code: string;
    radius_km: number;
  }>;
  portfolio_items: Array<{
    id?: string;
    title: string;
    portfolio_description: string;
    image_url: string;
  }>;
}

export function ProviderProfileForm() {
  const navigate = useNavigate();
  const { user, profile, loadProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'services' | 'areas' | 'portfolio'>('basic');
  const [formData, setFormData] = useState<FormData>({
    business_name: '',
    business_description: '',
    years_in_business: 0,
    website: '',
    available: true,
    services: [],
    service_areas: [],
    portfolio_items: []
  });

  useEffect(() => {
    if (!user?.id) return;
    loadProviderData();
  }, [user?.id]);

  const loadProviderData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // First, check if provider profile exists
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle non-existent profiles

      if (providerError) throw providerError;

      // If no provider profile exists, create one
      if (!providerData) {
        const { error: createError } = await supabase
          .from('provider_profiles')
          .insert({
            id: user.id,
            business_name: '',
            business_description: '',
            years_in_business: 0,
            website: '',
            available: true,
            profile_completion_percentage: 0
          });

        if (createError) throw createError;

        // Set initial form data with empty values
        setFormData({
          business_name: '',
          business_description: '',
          years_in_business: 0,
          website: '',
          available: true,
          services: [],
          service_areas: [],
          portfolio_items: []
        });
        return;
      }

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', user.id);

      if (servicesError) throw servicesError;

      // Load service areas
      const { data: areasData, error: areasError } = await supabase
        .from('service_areas')
        .select('*')
        .eq('provider_id', user.id);

      if (areasError) throw areasError;

      // Load portfolio items
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', user.id);

      if (portfolioError) throw portfolioError;

      setFormData({
        business_name: providerData.business_name || '',
        business_description: providerData.business_description || '',
        years_in_business: providerData.years_in_business || 0,
        website: providerData.website || '',
        available: providerData.available ?? true,
        services: servicesData || [],
        service_areas: areasData || [],
        portfolio_items: portfolioData || []
      });
    } catch (error) {
      console.error('Error loading provider data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);

      // Validate required fields
      if (!formData.business_name.trim()) {
        toast.error('Business name is required');
        return;
      }

      if (!formData.business_description.trim()) {
        toast.error('Business description is required');
        return;
      }

      // Normalize website URL
      const normalizedWebsite = normalizeUrl(formData.website);

      // First, ensure provider profile exists or update it
      const { error: profileError } = await supabase
        .from('provider_profiles')
        .upsert({
          id: user.id,
          business_name: formData.business_name,
          business_description: formData.business_description,
          years_in_business: formData.years_in_business,
          website: normalizedWebsite,
          available: formData.available,
          profile_completion_percentage: calculateCompletionPercentage(),
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Update services
      if (formData.services.length > 0) {
        // Delete existing services
        const { error: deleteError } = await supabase
          .from('provider_services')
          .delete()
          .eq('provider_id', user.id);

        if (deleteError) throw deleteError;

        // Insert new services
        const { error: servicesError } = await supabase
          .from('provider_services')
          .insert(formData.services.map(service => ({
            provider_id: user.id,
            ...service
          })));

        if (servicesError) throw servicesError;
      }

      // Update service areas
      if (formData.service_areas.length > 0) {
        // Delete existing areas
        const { error: deleteError } = await supabase
          .from('service_areas')
          .delete()
          .eq('provider_id', user.id);

        if (deleteError) throw deleteError;

        // Insert new areas
        const { error: areasError } = await supabase
          .from('service_areas')
          .insert(formData.service_areas.map(area => ({
            provider_id: user.id,
            ...area
          })));

        if (areasError) throw areasError;
      }

      // Update portfolio items
      for (const item of formData.portfolio_items) {
        if (item.id) {
          // Update existing item
          const { error: updateError } = await supabase
            .from('provider_portfolio')
            .update({
              title: item.title,
              portfolio_description: item.portfolio_description
            })
            .eq('id', item.id)
            .eq('provider_id', user.id); // Add provider_id check for security

          if (updateError) throw updateError;
        }
      }

      await loadProfile();
      toast.success('Profile updated successfully');
      navigate('/provider-dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionPercentage = () => {
    let completed = 0;
    let total = 0;

    // Basic profile fields
    const basicFields = ['business_name', 'business_description', 'website'];
    basicFields.forEach(field => {
      total++;
      if (formData[field as keyof FormData]) completed++;
    });

    // Services
    total++;
    if (formData.services.length > 0) completed++;

    // Service areas
    total++;
    if (formData.service_areas.length > 0) completed++;

    // Portfolio
    total++;
    if (formData.portfolio_items.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleImageUpload = async (file: File) => {
    if (!user?.id) return;

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('provider-portfolio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider-portfolio')
        .getPublicUrl(filePath);

      // Save to portfolio table
      const { error: portfolioError } = await supabase
        .from('provider_portfolio')
        .insert({
          provider_id: user.id,
          title: file.name,
          portfolio_description: '',
          image_url: publicUrl
        });

      if (portfolioError) throw portfolioError;

      await loadProviderData();
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', name: 'Basic Info' },
            { id: 'services', name: 'Services' },
            { id: 'areas', name: 'Service Areas' },
            { id: 'portfolio', name: 'Portfolio' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.name}
              {tab.id === 'services' && formData.services.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {formData.services.length}
                </span>
              )}
              {tab.id === 'areas' && formData.service_areas.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {formData.service_areas.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years in Business</label>
              <input
                type="number"
                min="0"
                value={formData.years_in_business}
                onChange={(e) => setFormData({ ...formData, years_in_business: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Website or Social Media Profile</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="website.com or social media profile URL"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your website URL or social media profile (e.g. facebook.com/profile, @twitter_handle)
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                Available for new projects
              </label>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className={activeTab === 'services' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            {formData.services.map((service, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        value={service.category}
                        onChange={(e) => {
                          const newServices = [...formData.services];
                          newServices[index].category = e.target.value as ServiceCategory;
                          setFormData({ ...formData, services: newServices });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        {SERVICE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rate Type</label>
                      <select
                        value={service.rate_type}
                        onChange={(e) => {
                          const newServices = [...formData.services];
                          newServices[index].rate_type = e.target.value as 'hourly' | 'fixed' | 'quote';
                          setFormData({ ...formData, services: newServices });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="hourly">Hourly Rate</option>
                        <option value="fixed">Fixed Rate</option>
                        <option value="quote">Quote Based</option>
                      </select>
                    </div>

                    {service.rate_type !== 'quote' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Minimum Rate ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={service.rate_range_min}
                            onChange={(e) => {
                              const newServices = [...formData.services];
                              newServices[index].rate_range_min = parseInt(e.target.value);
                              setFormData({ ...formData, services: newServices });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Maximum Rate ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={service.rate_range_max}
                            onChange={(e) => {
                              const newServices = [...formData.services];
                              newServices[index].rate_range_max = parseInt(e.target.value);
                              setFormData({ ...formData, services: newServices });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {formData.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newServices = formData.services.filter((_, i) => i !== index);
                        setFormData({ ...formData, services: newServices });
                      }}
                      className="ml-4 p-1 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  services: [
                    ...formData.services,
                    {
                      category: SERVICE_CATEGORIES[0],
                      rate_type: 'hourly',
                      rate_range_min: 0,
                      rate_range_max: 0
                    }
                  ]
                });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Service
            </button>
          </div>
        </div>

        {/* Service Areas */}
        <div className={activeTab === 'areas' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            {formData.service_areas.map((area, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          required
                          value={area.city}
                          onChange={(e) => {
                            const newAreas = [...formData.service_areas];
                            newAreas[index].city = e.target.value;
                            setFormData({ ...formData, service_areas: newAreas });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input
                          type="text"
                          required
                          value={area.state}
                          onChange={(e) => {
                            const newAreas = [...formData.service_areas];
                            newAreas[index].state = e.target.value;
                            setFormData({ ...formData, service_areas: newAreas });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                        <input
                          type="text"
                          required
                          value={area.postal_code}
                          onChange={(e) => {
                            const newAreas = [...formData.service_areas];
                            newAreas[index].postal_code = e.target.value;
                            setFormData({ ...formData, service_areas: newAreas });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Service Radius (km)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={area.radius_km}
                          onChange={(e) => {
                            const newAreas = [...formData.service_areas];
                            newAreas[index].radius_km = parseInt(e.target.value);
                            setFormData({ ...formData, service_areas: newAreas });
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {formData.service_areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newAreas = formData.service_areas.filter((_, i) => i !== index);
                        setFormData({ ...formData, service_areas: newAreas });
                      }}
                      className="ml-4 p-1 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  service_areas: [
                    ...formData.service_areas,
                    {
                      city: '',
                      state: '',
                      postal_code: '',
                      radius_km: 0
                    }
                  ]
                });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Service Area
            </button>
          </div>
        </div>

        {/* Portfolio */}
        <div className={activeTab === 'portfolio' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.portfolio_items.map((item, index) => (
                <div key={index} className="relative aspect-square group bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...formData.portfolio_items];
                          newItems[index].title = e.target.value;
                          setFormData({ ...formData, portfolio_items: newItems });
                        }}
                        className="bg-transparent text-white border-b border-white"
                        placeholder="Title"
                      />
                      <textarea
                        value={item.portfolio_description}
                        onChange={(e) => {
                          const newItems = [...formData.portfolio_items];
                          newItems[index].portfolio_description = e.target.value;
                          setFormData({ ...formData, portfolio_items: newItems });
                        }}
                        className="bg-transparent text-white border-b border-white mt-2"
                        placeholder="Description"
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.portfolio_items.filter((_, i) => i !== index);
                          setFormData({ ...formData, portfolio_items: newItems });
                        }}
                        className="mt-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <label className="relative aspect-square bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Add Image</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}