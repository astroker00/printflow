import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderEvent, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

// ─── useOrders — admin order list with real-time updates ──────────────────────

export function useOrders() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.status === 401) {
        setError('Unauthorized');
        return;
      }
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setOrders(data.orders ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        payload => {
          setOrders(prev => [payload.new as Order, ...prev]);
          toast.success(`New order from ${(payload.new as Order).student_name}`, { icon: '🔔' });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        payload => {
          setOrders(prev =>
            prev.map(o => o.id === payload.new.id ? (payload.new as Order) : o),
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Mutation helpers ──────────────────────────────────────────────────────

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update order'); return null; }
    const { order } = await res.json();
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    if (status === 'ready') toast.success('Student notified ✓');
    return order as Order;
  }, []);

  const updateNotes = useCallback(async (orderId: string, admin_notes: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes }),
    });
  }, []);

  const cancelOrder = useCallback(async (orderId: string) => {
    return updateStatus(orderId, 'cancelled');
  }, [updateStatus]);

  return {
    orders, loading, error,
    refetch: () => fetchOrders(true),
    updateStatus, updateNotes, cancelOrder,
  };
}

// ─── useOrderTracking — single order with live updates ───────────────────────

export function useOrderTracking(orderNumber: string | null) {
  const [order, setOrder]   = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (res.status === 404) { setError('Order not found'); return; }
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setOrder(data.order);
      setEvents(data.events ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderNumber) fetchOrder(orderNumber);
    else setLoading(false);
  }, [orderNumber, fetchOrder]);

  // Subscribe to order updates
  useEffect(() => {
    if (!order?.id) return;
    const supabase = createClient();
    const channel  = supabase
      .channel(`track-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        payload => setOrder(payload.new as Order),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${order.id}` },
        payload => setEvents(prev => [...prev, payload.new as OrderEvent]),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

  return { order, events, loading, error };
}

// ─── useFileUpload — upload multiple files with progress tracking ─────────────

export interface UploadResult {
  name: string;
  url: string;
  storage_path: string;
  size: number;
}

export function useFileUpload() {
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true);
    abortRef.current = new AbortController();
    const results: UploadResult[] = [];

    try {
      for (const file of files) {
        setProgress(p => ({ ...p, [file.name]: 0 }));

        const form = new FormData();
        form.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: form,
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error ?? `Failed to upload ${file.name}`);
        }

        const data = await res.json();
        results.push(data);
        setProgress(p => ({ ...p, [file.name]: 100 }));
      }
    } finally {
      setUploading(false);
      setProgress({});
    }

    return results;
  }, []);

  const cancel = () => abortRef.current?.abort();

  return { upload, uploading, progress, cancel };
}

// ─── useLocalStorage — persist values across sessions ────────────────────────

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [value, set] as const;
}
