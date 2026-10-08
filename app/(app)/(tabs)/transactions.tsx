import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Fab } from '@/components/Fab';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingView } from '@/components/StateViews';
import { TransactionItem } from '@/components/TransactionItem';
import { useTransactions } from '@/hooks/useTransactions';
import { colors, radius, spacing } from '@/theme';
import type { Transaction, TransactionType } from '@/types';
import { currentYearMonth, dayLabel } from '@/utils/date';
import type { YearMonth } from '@/utils/date';
import { friendlyError } from '@/utils/errors';
import { filterTransactions, groupByDate } from '@/utils/summary';
import type { DayGroup } from '@/utils/summary';

type Filter = 'all' | TransactionType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Receitas' },
  { value: 'expense', label: 'Despesas' },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [month, setMonth] = useState<YearMonth>(currentYearMonth());
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(month);

  const groups = useMemo(
    () => groupByDate(filterTransactions(data ?? [], filter, query)),
    [data, filter, query],
  );

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  const header = (
    <View style={styles.header}>
      <MonthSwitcher value={month} onChange={setMonth} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por descrição ou categoria"
        placeholderTextColor={colors.muted}
        style={styles.search}
        clearButtonMode="while-editing"
      />
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setFilter(item.value)}
            style={[styles.filter, filter === item.value && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.value && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.flex}>
        <SectionList<Transaction, DayGroup>
          sections={groups}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              title="Nenhum lançamento"
              message="Nada encontrado neste mês com esses filtros."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.day}>{dayLabel(section.date)}</Text>
          )}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}`)}
            />
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
        <Fab />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 100 },
  header: { marginBottom: spacing.sm },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  filter: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  filterTextActive: { color: '#FFFFFF' },
  day: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
