import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/data/products';

export async function refreshStock(productId: string): Promise<number> {
  const { data, error } = await supabase.from('product_inventory').select('stock').eq('product_id', productId).single();
  if (error || !data) throw new Error('Stock could not be checked. Please try again.');
  return data.stock;
}

export function useInventory(product: Product | undefined) {
  const query = useQuery({
    queryKey: ['stock', product?.id],
    queryFn: () => refreshStock(product?.id ?? ''),
    enabled: Boolean(product),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
    retry: 1,
  });
  return { ...query, stock: query.isError ? 0 : query.data ?? 0, available: !query.isError && (query.data ?? 0) > 0 };
}