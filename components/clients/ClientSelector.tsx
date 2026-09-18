// components/clients/ClientSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Client {
  id: string;
  clientName: string;
  clientNo?: string;
  email?: string;
  status?: string;
  relationshipType?: string;
}

interface ClientSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filter?: (client: Client) => boolean;
  excludeOnCreditHold?: boolean;
}

export function ClientSelector({
  value,
  onChange,
  placeholder = 'Select a client',
  disabled = false,
  className,
  filter,
  excludeOnCreditHold = false,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query params
        const params = new URLSearchParams();
        if (excludeOnCreditHold) {
          params.append('excludeOnCreditHold', 'true');
        }

        const url = `/api/clients${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch clients');
        }

        const data = await response.json();
        
        // Handle both response formats (array or { clients: [] })
        let clientList = Array.isArray(data) ? data : data.clients || [];
        
        if (filter) {
          clientList = clientList.filter(filter);
        }
        
        setClients(clientList);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [filter, excludeOnCreditHold]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading clients...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
        {error}
        <button 
          onClick={() => window.location.reload()} 
          className="ml-2 text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || clients.length === 0}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={clients.length === 0 ? 'No clients available' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            <div className="flex items-center gap-2">
              <span>{client.clientName}</span>
              {client.clientNo && (
                <span className="text-xs text-muted-foreground">
                  #{client.clientNo}
                </span>
              )}
              {client.email && (
                <span className="text-xs text-muted-foreground">
                  ({client.email})
                </span>
              )}
              {client.status && client.status !== 'ACTIVE' && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  client.status === 'INACTIVE' ? 'bg-gray-100 text-gray-600' :
                  client.status === 'BLACKLISTED' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {client.status}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}