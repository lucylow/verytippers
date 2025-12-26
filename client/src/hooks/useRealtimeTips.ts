import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Tip {
  id: string;
  created_at: string;
  from_user: string;
  to_user: string;
  amount: string;
  cid_id: string | null;
  meta_tx: any;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  relayer_tx_hash: string | null;
  confirmations: number;
  chain_network: string;
  notes: string | null;
}

export function useRealtimeTips(userId: string | null) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;

    // Initial fetch
    const fetchTips = async () => {
      const { data, error } = await supabase
        .from('tips')
        .select('*')
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tips:', error);
      } else {
        setTips(data || []);
      }
      setLoading(false);
    };

    fetchTips();

    // Subscribe to realtime changes
    channel = supabase
      .channel(`tips:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `or(from_user.eq.${userId},to_user.eq.${userId})`,
        },
        (payload) => {
          console.log('Tip event received:', payload);
          
          // Refetch to ensure consistency
          fetchTips();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  return { tips, loading };
}

