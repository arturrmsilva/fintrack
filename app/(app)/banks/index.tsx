import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BankConnectionCard } from '@/components/BankConnectionCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useBankConnections, useDisconnectBank, useSyncBank } from '@/hooks/useBanks';
import { OPEN_FINANCE_SANDBOX } from '@/lib/config';
import { colors, radius, spacing } from '@/theme';
import { friendlyError } from '@/utils/errors';

export default function BanksScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBankConnections();
  const sync = useSyncBank();
  const disconnect = useDisconnectBank();
  const [syncingItem, setSyncingItem] = useState<string | null>(null);

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  function runSync(itemId: string) {
    setSyncingItem(itemId);
    sync.mutate(itemId, {
      onSuccess: (result) =>
        Alert.alert(
          'Sincronização concluída',
          result.imported > 0
            ? `${result.imported} lançamentos novos importados.`
            : 'Nenhum lançamento novo desde a última sincronização.',
        ),
      onError: (e) => Alert.alert('Não foi possível sincronizar', friendlyError(e)),
      onSettled: () => setSyncingItem(null),
    });
  }

  function confirmDisconnect(connectionId: string, name: string) {
    Alert.alert(
      `Desconectar ${name}?`,
      'O acesso será revogado e os lançamentos importados deste banco serão apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () =>
            disconnect.mutate(connectionId, {
              onError: (e) =>
                Alert.alert('Não foi possível desconectar', friendlyError(e)),
            }),
        },
      ],
    );
  }

  const connections = data ?? [];

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {OPEN_FINANCE_SANDBOX ? (
          <View style={styles.sandbox}>
            <Ionicons name="flask" size={16} color="#B45309" />
            <Text style={styles.sandboxText}>
              Modo de testes: bancos fictícios habilitados.
            </Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.privacyHeader}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.privacyTitle}>Somente leitura</Text>
          </View>
          <Text style={styles.privacyText}>
            O FinTrack só lê seus extratos, com a sua autorização (Open Finance). Ele
            nunca movimenta dinheiro nem guarda a senha do banco. Você pode revogar o
            acesso quando quiser.
          </Text>
        </Card>

        {connections.length === 0 ? (
          <Text style={styles.empty}>Nenhum banco conectado ainda.</Text>
        ) : (
          connections.map((connection) => (
            <BankConnectionCard
              key={connection.id}
              connection={connection}
              syncing={syncingItem === connection.pluggy_item_id}
              onSync={() => runSync(connection.pluggy_item_id)}
              onDisconnect={() =>
                confirmDisconnect(connection.id, connection.institution_name)
              }
            />
          ))
        )}

        <Button title="Conectar um banco" onPress={() => router.push('/banks/connect')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  sandbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  sandboxText: { fontSize: 13, color: '#B45309', flex: 1 },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  privacyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  privacyText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
});
