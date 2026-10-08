import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionInput } from '@/types';

const SELECT = '*, category:categories(id, name, type, icon, color)';

export interface DateRange {
  start: string; // inclusivo
  endExclusive: string; // exclusivo
}

export async function listTransactions(range?: DateRange): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select(SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (range) {
    query = query.gte('date', range.start).lt('date', range.endExclusive);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Transaction[];
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Transaction;
}

export async function createTransaction(input: TransactionInput): Promise<void> {
  // user_id é preenchido pelo banco (default auth.uid()).
  const { error } = await supabase.from('transactions').insert(input);
  if (error) throw error;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<void> {
  const { error } = await supabase.from('transactions').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// Lançamentos importados do banco só permitem trocar a categoria.
export async function updateTransactionCategory(
  id: string,
  categoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId })
    .eq('id', id);
  if (error) throw error;
}
