import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, icon, color')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
}
