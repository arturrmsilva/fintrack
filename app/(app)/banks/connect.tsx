import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PluggyConnect } from 'react-native-pluggy-connect';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useConnectToken, useSyncBank } from '@/hooks/useBanks';
import { OPEN_FINANCE_SANDBOX } from '@/lib/config';
import { colors, spacing } from '@/theme';
import { friendlyError } from '@/utils/errors';

export default function ConnectBankScreen() {
  const router = useRouter();
  // Endereço para onde o banco devolve o usuário depois de autorizar (deep link do app).
  const redirectUri = useMemo(() => Linking.createURL('banks/callback'), []);
  const { data: connectToken, isError, error, refetch } = useConnectToken(redirectUri);
  const sync = useSyncBank();
  const [importing, setImporting] = useState(false);

  const handleSuccess = useCallback(
    async (data: { item: { id: string } }) => {
      setImporting(true); // desmonta o widget e mostra o progresso
      try {
        const result = await sync.mutateAsync(data.item.id);
        Alert.alert(
          'Banco conectado',
          result.imported > 0
            ? `${result.imported} lançamentos importados.`
            : 'Conexão feita. Nenhum lançamento encontrado no período.',
        );
      } catch (e) {
        Alert.alert(
          'Conectado, mas a importação falhou',
          `${friendlyError(e)}\n\nToque em Sincronizar na lista de bancos para tentar de novo.`,
        );
      }
      router.replace('/banks');
    },
    [router, sync],
  );

  const handleError = useCallback(
    (e: { message: string }) => {
      Alert.alert('Não foi possível conectar', e.message || 'Tente novamente.');
      router.back();
    },
    [router],
  );

  const handleClose = useCallback(() => router.back(), [router]);

  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;
  if (!connectToken) return <LoadingView />;
  if (importing) {
    return (
      <View style={styles.importing}>
        <LoadingView />
        <Text style={styles.importingText}>Importando seus lançamentos...</Text>
      </View>
    );
  }

  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox={OPEN_FINANCE_SANDBOX}
      onSuccess={handleSuccess}
      onError={handleError}
      onClose={handleClose}
    />
  );
}

const styles = StyleSheet.create({
  importing: { flex: 1, backgroundColor: colors.background },
  importingText: {
    textAlign: 'center',
    color: colors.text,
    fontWeight: '600',
    paddingBottom: spacing.xl,
  },
});
