import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import type { Transaction } from '@/types';
import { safeIcon } from '@/utils/icons';
import { formatMoney } from '@/utils/money';

interface TransactionItemProps {
  transaction: Transaction;
  onPress: () => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const color = transaction.category?.color ?? colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Ionicons
          name={safeIcon(transaction.category?.icon ?? '')}
          size={22}
          color={color}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.categoryRow}>
          {transaction.source === 'open_finance' ? (
            <Ionicons name="business" size={12} color={colors.muted} />
          ) : null}
          <Text style={styles.category} numberOfLines={1}>
            {transaction.category?.name ?? 'Sem categoria'}
            {transaction.source === 'open_finance' && transaction.account_name
              ? ` · ${transaction.account_name}`
              : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+ ' : '- '}
        {formatMoney(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.8 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  description: { fontSize: 16, fontWeight: '600', color: colors.text },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  category: { flexShrink: 1, fontSize: 13, color: colors.muted },
  amount: { fontSize: 15, fontWeight: '700' },
});
