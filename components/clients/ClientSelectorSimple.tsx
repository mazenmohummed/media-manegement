// components/clients/ClientSelectorSimple.tsx
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

interface ClientSelectorSimpleProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClientSelectorSimple({
  value,
  onChange,
  placeholder = 'Select a client',
  disabled = false,
  className,
}: ClientSelectorSimpleProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/clients');
        
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }

        const data = await response.json();
        // Handle both response formats
        const clientList = Array.isArray(data) ? data : data.clients || [];
        setClients(clientList);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading clients...</span>
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
            {client.clientName}
            {client.clientNo && (
              <span className="ml-2 text-xs text-muted-foreground">
                #{client.clientNo}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}