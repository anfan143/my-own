import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserType } from '../types/supabase';

interface Step {
  id: string;
  title: string;
  fields: Field[];
  isComplete: boolean;
}

interface Field {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea';
  required: boolean;
  value: string;
}

interface ProfileCompletionFormProps {
  userType: UserType;
  onComplete: () => void;
  onCancel: () => void;
}

export function ProfileCompletionForm({ userType, onComplete, onCancel }: ProfileCompletionFormProps) {
  const navigate = useNavigate();
  const { user, profile, loadProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    email: '',
    phone: '',
    location: '',

    // Provider-specific fields
    business_name: '',
    business_description: '',
    years_in_business: '',
    website: '',
  });

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        business_name: profile.name ? `${profile.name}'s Business` : '',
      }));
    }
  }, [profile]);

  const steps: Step[] = userType === 'provider' ? [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true, value: formData.name },
        { name: 'email', label: 'Email', type: 'email', required: true, value: formData.email },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true, value: formData.phone },
        { name: 'location', label: 'Location', type: 'text', required: true, value: formData.location },
      ],
      isComplete: false
    },
    {
      id: 'business',
      title: 'Business Information',
      fields: [
        { name: 'business_name', label: 'Business Name', type: 'text', required: true, value: formData.business_name },
        { name: 'business_description', label: 'Business Description', type: 'textarea', required: true, value: formData.business_description },
        { name: 'years_in_business', label: 'Years in Business', type: 'number', required: true, value: formData.years_in_business },
        { name: 'website', label: 'Website', type: 'text', required: false, value: formData.website },
      ],
      isComplete: false
    }
  ] : [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true, value: formData.name },
        { name: 'email', label: 'Email', type: 'email', required: true, value: formData.email },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true, value: formData.phone },
        { name: 'location', label: 'Location', type: 'text', required: true, value: formData.location },
      ],
      isComplete: false
    }
  ];

  const currentStep = steps[currentStepIndex];

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Update business name when name changes in first step
      ...(name === 'name' && currentStepIndex === 0 ? {
        business_name: value ? `${value}'s Business` : ''
      } : {})
    }));
  };

  const isStepComplete = (step: Step) => {
    return step.fields.every(field => !field.required || formData[field.name as keyof typeof formData]);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update provider profile if applicable
      if (userType === 'provider') {
        const { error: providerError } = await supabase
          .from('provider_profiles')
          .update({
            business_name: formData.business_name,
            business_description: formData.business_description,
            years_in_business: parseInt(formData.years_in_business),
            website: formData.website,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (providerError) throw providerError;
      }

      await loadProfile();
      toast.success('Profile completed successfully');
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error('Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please complete your profile information to continue as a {userType}.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full
                    ${index <= currentStepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {isStepComplete(step) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4 h-0.5 bg-gray-200" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name as keyof typeof formData]}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={currentStepIndex === 0 ? onCancel : handleBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              {currentStepIndex === 0 ? 'Cancel' : 'Back'}
            </button>
            {currentStepIndex === steps.length - 1 ? (
              <button
                type="submit"
                disabled={loading || !isStepComplete(currentStep)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStepComplete(currentStep)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}