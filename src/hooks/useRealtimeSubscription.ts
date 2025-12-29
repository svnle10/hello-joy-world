import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'daily_reports' | 'groups' | 'bookings' | 'guide_unavailability' | 'daily_assignments';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  onDataChange: () => void;
}

export function useRealtimeSubscription({ tables, onDataChange }: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a unique channel name
    const channelName = `realtime-${tables.join('-')}-${Date.now()}`;
    
    // Create the channel
    let channel = supabase.channel(channelName);

    // Subscribe to each table
    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`Realtime update on ${table}:`, payload);
          onDataChange();
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Realtime subscription status: ${status}`);
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tables.join(','), onDataChange]);
}
