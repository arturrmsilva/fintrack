import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';
import type { Summary } from '@/utils/summary';

export function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>Saldo do mês</Text>
        <Text style={styles.balanceValue}>{formatMoney(summary.balance)}</Text>
      </View>
      <View style={styles.row}>
        <MiniCard
          label="Receitas"
          value={summary.income}
          color={colors.income}
          icon="arrow-up-circle"
        />
        <MiniCard
          label="Despesas"
          value={summary.expense}
          color={colors.expense}
          icon="arrow-down-circle"
        />
      </View>
    </View>
  );
}

interface MiniCardProps {
  label: string;
  value: number;
  color: string;
  icon: 'arrow-up-circle' | 'arrow-down-circle';
}

function MiniCard({ label, value, color, icon }: MiniCardProps) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={26} color={color} />
      <View>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={[styles.miniValue, { color }]}>{formatMoney(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  balance: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  balanceLabel: { color: '#CCFBF1', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  mini: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  miniLabel: { fontSize: 13, color: colors.muted },
  miniValue: { fontSize: 16, fontWeight: '700' },
});
