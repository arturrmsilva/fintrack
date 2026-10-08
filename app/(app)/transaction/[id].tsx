import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ImportedTransactionForm } from '@/components/ImportedTransactionForm';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { TransactionForm } from '@/components/TransactionForm';
import {
  useDeleteTransaction,
  useRecategorizeTransaction,
  useSaveTransaction,
  useTransaction,
} from '@/hooks/useTransactions';
import { friendlyError } from '@/utils/errors';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useTransaction(id);
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const recategorize = useRecategorizeTransaction();

  if (isLoading) return <LoadingView />;
  if (isError || !data) {
    return <ErrorState message={friendlyError(error)} onRetry={refetch} />;
  }

  function confirmDelete() {
    Alert.alert('Excluir lançamento', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Erro ao excluir', friendlyError(e)),
          }),
      },
    ]);
  }

  if (data.source === 'open_finance') {
    return (
      <Screen scroll edges={['bottom', 'left', 'right']}>
        <ImportedTransactionForm
          transaction={data}
          submitting={recategorize.isPending}
          onSubmit={(categoryId) =>
            recategorize.mutate(
              { id: data.id, categoryId },
              {
                onSuccess: () => router.back(),
                onError: (e) => Alert.alert('Não foi possível salvar', friendlyError(e)),
              },
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <TransactionForm
        initial={data}
        submitting={save.isPending}
        onDelete={confirmDelete}
        onSubmit={(input) =>
          save.mutate(
            { id, input },
            {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert('Não foi possível salvar', friendlyError(e)),
            },
          )
        }
      />
    </Screen>
  );
}
