import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  updateTransactionCategory,
} from '@/services/transactions';
import type { TransactionInput } from '@/types';
import { monthRange, type YearMonth } from '@/utils/date';

export function useTransactions(month: YearMonth) {
  return useQuery({
    queryKey: ['transactions', 'month', month.year, month.month],
    queryFn: () => listTransactions(monthRange(month)),
    placeholderData: keepPreviousData, // evita piscar ao trocar de mês
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => getTransaction(id as string),
    enabled: Boolean(id),
  });
}

interface SaveVariables {
  id?: string;
  input: TransactionInput;
}

export function useSaveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: SaveVariables) =>
      id ? updateTransaction(id, input) : createTransaction(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useRecategorizeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      updateTransactionCategory(id, categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
