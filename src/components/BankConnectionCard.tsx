import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';
import type { BankConnection } from '@/types';
import { formatDateTime } from '@/utils/date';
import { Button } from './Button';

interface BankConnectionCardProps {
  connection: BankConnection;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}

export function BankConnectionCard({
  connection,
  syncing,
  onSync,
  onDisconnect,
}: BankConnectionCardProps) {
  const failed = connection.status === 'error';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {connection.institution_image_url ? (
          <Image source={{ uri: connection.institution_image_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Ionicons name="business" size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{connection.institution_name}</Text>
          <Text style={styles.meta}>
            {connection.last_synced_at
              ? `Sincronizado em ${formatDateTime(connection.last_synced_at)}`
              : 'Ainda não sincronizado'}
          </Text>
        </View>
      </View>

      {failed && connection.last_error ? (
        <Text style={styles.error}>{connection.last_error}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Sincronizar"
          variant="secondary"
          onPress={onSync}
          loading={syncing}
          style={styles.action}
        />
        <Button
          title="Desconectar"
          variant="ghost"
          onPress={onDisconnect}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1, minHeight: 44 },
});
