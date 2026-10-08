import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { TransactionForm } from '@/components/TransactionForm';
import { useSaveTransaction } from '@/hooks/useTransactions';
import { friendlyError } from '@/utils/errors';

export default function NewTransactionScreen() {
  const router = useRouter();
  const save = useSaveTransaction();

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <TransactionForm
        submitting={save.isPending}
        onSubmit={(input) =>
          save.mutate(
            { input },
            {
              onSuccess: () => router.back(),
              onError: (error) =>
                Alert.alert('Não foi possível salvar', friendlyError(error)),
            },
          )
        }
      />
    </Screen>
  );
}
