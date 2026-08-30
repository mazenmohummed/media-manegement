// components/tasks/TaskLocationForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin, AlertCircle, CheckCircle2, Loader2, Pencil, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TaskLocationFormProps {
  taskId: string;
  initialLocation?: {
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
  };
  onUpdate?: () => void;
}

export function TaskLocationForm({ taskId, initialLocation, onUpdate }: TaskLocationFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Track if we're in edit mode
  const [isEditing, setIsEditing] = useState(!initialLocation?.latitude);

  const [locationName, setLocationName] = useState(initialLocation?.locationName || '');
  const [latitude, setLatitude] = useState(initialLocation?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialLocation?.longitude?.toString() || '');
  const [radius, setRadius] = useState(initialLocation?.radius?.toString() || '200');

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const hasLocation = initialLocation?.latitude && initialLocation?.longitude;

  // Generate Google Maps URL
  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  // Get Google Maps directions URL
  const getGoogleMapsDirectionsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const getCurrentLocation = () => {
    setLocationStatus('loading');
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLatitude(latitude.toString());
        setLongitude(longitude.toString());
        setLocationStatus('success');
      },
      (err) => {
        setError(`Failed to get location: ${err.message}`);
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tasks/${taskId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: locationName.trim() || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          radius: radius ? parseInt(radius) : 200,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setSuccess(true);
      setIsEditing(false); // Exit edit mode on successful save
      if (onUpdate) onUpdate();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Reset to view mode when location is saved
  const handleCancel = () => {
    if (hasLocation) {
      // Reset form values to initial location
      setLocationName(initialLocation?.locationName || '');
      setLatitude(initialLocation?.latitude?.toString() || '');
      setLongitude(initialLocation?.longitude?.toString() || '');
      setRadius(initialLocation?.radius?.toString() || '200');
      setIsEditing(false);
    }
  };

  // If location exists and we're not editing, show the location details
  if (hasLocation && !isEditing) {
    const lat = initialLocation.latitude!;
    const lng = initialLocation.longitude!;
    const mapsUrl = getGoogleMapsUrl(lat, lng);
    const directionsUrl = getGoogleMapsDirectionsUrl(lat, lng);

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Task Location</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-2 bg-zinc-950/50 rounded-lg p-4">
          {initialLocation.locationName && (
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs text-zinc-400">Location Name</span>
              <span className="text-sm text-zinc-200 font-medium">{initialLocation.locationName}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs text-zinc-400">Coordinates</span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 transition-colors"
            >
              {lat.toFixed(6)}, {lng.toFixed(6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-zinc-400">Geofence Radius</span>
            <span className="text-sm text-zinc-200 font-medium">{initialLocation.radius || 200} meters</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            <MapPin className="w-3 h-3 inline mr-1" />
            Location-based attendance tracking is active
          </div>
          <div className="flex gap-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Get Directions
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show the edit form (either when no location exists or user clicked Edit)
  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            {hasLocation ? 'Edit Location' : 'Set Task Location'}
          </h3>
        </div>
        {hasLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">Location Name</label>
        <Input
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g., Client Office, Production Studio"
          className="bg-zinc-950 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Latitude</label>
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g., 30.0444"
            className="bg-zinc-950 border-zinc-700 text-zinc-100"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Longitude</label>
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g., 31.2357"
            className="bg-zinc-950 border-zinc-700 text-zinc-100"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Radius (meters)</label>
          <Input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="200"
            className="bg-zinc-950 border-zinc-700 text-zinc-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={locationStatus === 'loading'}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {locationStatus === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Use Current Location
        </Button>

        {locationStatus === 'success' && userLocation && (
          <div className="flex items-center gap-2 text-emerald-500 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            Location captured
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4" />
          Location updated successfully!
        </div>
      )}

      <Button
        type="submit"
        disabled={saving}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {saving ? 'Saving...' : hasLocation ? 'Update Location' : 'Save Location'}
      </Button>
    </form>
  );
}