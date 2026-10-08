import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { Fab } from '@/components/Fab';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { SummaryCards } from '@/components/SummaryCards';
import { TransactionItem } from '@/components/TransactionItem';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { colors, spacing } from '@/theme';
import { currentYearMonth } from '@/utils/date';
import type { YearMonth } from '@/utils/date';
import { friendlyError } from '@/utils/errors';
import { formatMoney } from '@/utils/money';
import { summarize } from '@/utils/summary';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [month, setMonth] = useState<YearMonth>(currentYearMonth());
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(month);

  const transactions = data ?? [];
  const summary = useMemo(() => summarize(data ?? []), [data]);
  const firstName = String(user?.user_metadata?.full_name ?? '').split(' ')[0];

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  return (
    <Screen>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <Text style={styles.greeting}>Olá{firstName ? `, ${firstName}` : ''} </Text>

          <MonthSwitcher value={month} onChange={setMonth} />
          <SummaryCards summary={summary} />

          <Card>
            <Text style={styles.cardTitle}>Despesas por categoria</Text>
            {summary.byCategory.length === 0 ? (
              <Text style={styles.empty}>Sem despesas neste mês.</Text>
            ) : (
              <View style={styles.chartRow}>
                <DonutChart
                  data={summary.byCategory.map((c) => ({
                    value: c.total,
                    color: c.color,
                  }))}
                >
                  <Text style={styles.centerLabel}>Total</Text>
                  <Text style={styles.centerValue}>{formatMoney(summary.expense)}</Text>
                </DonutChart>
                <View style={styles.legend}>
                  {summary.byCategory.slice(0, 6).map((c) => (
                    <View key={c.categoryId} style={styles.legendRow}>
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text style={styles.legendName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.legendPercent}>{Math.round(c.percent)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Últimos lançamentos</Text>
            <Text style={styles.seeAll} onPress={() => router.push('/transactions')}>
              Ver todos
            </Text>
          </View>
          {transactions.length === 0 ? (
            <Text style={styles.empty}>Toque no + para registrar o primeiro.</Text>
          ) : (
            transactions
              .slice(0, 5)
              .map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onPress={() => router.push(`/transaction/${t.id}`)}
                />
              ))
          )}
        </ScrollView>
        <Fab />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 100 },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: spacing.sm },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  centerLabel: { fontSize: 12, color: colors.muted },
  centerValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 13, color: colors.text },
  legendPercent: { fontSize: 13, fontWeight: '700', color: colors.muted },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  seeAll: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
