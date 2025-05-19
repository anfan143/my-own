import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UnavailablePeriod {
  id: string;
  start_date: string;
  end_date: string;
}

export function AvailabilityManager() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriod[]>([]);
  const [newPeriod, setNewPeriod] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadAvailabilityStatus();
  }, []);

  const loadAvailabilityStatus = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Load provider profile
      const { data: profile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('available')
        .eq('id', user.user.id)
        .single();

      if (profileError) throw profileError;
      setIsAvailable(profile?.available ?? true);

      // Load unavailable periods
      const { data: periods, error: periodsError } = await supabase
        .from('provider_unavailable_periods')
        .select('*')
        .eq('provider_id', user.user.id)
        .order('start_date', { ascending: true });

      if (periodsError) throw periodsError;
      setUnavailablePeriods(periods || []);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability status');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('provider_profiles')
        .update({ available: !isAvailable })
        .eq('id', user.user.id);

      if (error) throw error;

      setIsAvailable(!isAvailable);
      toast.success(`You are now ${!isAvailable ? 'available' : 'unavailable'} for new projects`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability status');
    } finally {
      setSaving(false);
    }
  };

  const addUnavailablePeriod = async () => {
    try {
      if (!newPeriod.start_date || !newPeriod.end_date) {
        toast.error('Please select both start and end dates');
        return;
      }

      if (new Date(newPeriod.end_date) < new Date(newPeriod.start_date)) {
        toast.error('End date must be after start date');
        return;
      }

      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('provider_unavailable_periods')
        .insert({
          provider_id: user.user.id,
          start_date: newPeriod.start_date,
          end_date: newPeriod.end_date
        });

      if (error) throw error;

      toast.success('Unavailable period added');
      setNewPeriod({ start_date: '', end_date: '' });
      await loadAvailabilityStatus();
    } catch (error) {
      console.error('Error adding unavailable period:', error);
      toast.error('Failed to add unavailable period');
    } finally {
      setSaving(false);
    }
  };

  const removeUnavailablePeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('provider_unavailable_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Period removed');
      await loadAvailabilityStatus();
    } catch (error) {
      console.error('Error removing period:', error);
      toast.error('Failed to remove period');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Main Availability Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Availability Status</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set your general availability for new projects
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={saving}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isAvailable ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                transition duration-200 ease-in-out
                ${isAvailable ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
        <p className={`mt-2 text-sm ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
          {isAvailable ? 'Available for new projects' : 'Not available for new projects'}
        </p>
      </div>

      {/* Unavailable Periods */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Unavailable Periods</h2>
        
        {/* Add New Period */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={newPeriod.start_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, start_date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={newPeriod.end_date}
                min={newPeriod.start_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, end_date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={addUnavailablePeriod}
            disabled={saving || !newPeriod.start_date || !newPeriod.end_date}
            className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="inline-block animate-spin h-4 w-4 mr-2" />
                Adding...
              </>
            ) : (
              'Add Unavailable Period'
            )}
          </button>
        </div>

        {/* List of Periods */}
        <div className="space-y-3">
          {unavailablePeriods.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No unavailable periods set
            </p>
          ) : (
            unavailablePeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {new Date(period.start_date).toLocaleDateString()} -{' '}
                    {new Date(period.end_date).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => removeUnavailablePeriod(period.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}