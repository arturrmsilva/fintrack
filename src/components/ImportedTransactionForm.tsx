import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCategories } from '@/hooks/useCategories';
import { colors, radius, spacing } from '@/theme';
import type { Transaction } from '@/types';
import { isoToBr } from '@/utils/date';
import { safeIcon } from '@/utils/icons';
import { formatMoney } from '@/utils/money';
import { Button } from './Button';
import { Card } from './Card';

interface ImportedTransactionFormProps {
  transaction: Transaction;
  submitting: boolean;
  onSubmit: (categoryId: string) => void;
}

// Lançamento vindo do banco: valor, data e descrição são a "verdade" do banco e ficam
// bloqueados. O usuário só pode escolher outra categoria.
export function ImportedTransactionForm({
  transaction,
  submitting,
  onSubmit,
}: ImportedTransactionFormProps) {
  const { data: categories = [] } = useCategories();
  const [categoryId, setCategoryId] = useState(transaction.category_id);
  const options = categories.filter((c) => c.type === transaction.type);
  const isIncome = transaction.type === 'income';

  return (
    <View>
      <Card>
        <View style={styles.origin}>
          <Ionicons name="business" size={18} color={colors.primary} />
          <Text style={styles.originText}>
            Importado do banco
            {transaction.account_name ? ` · ${transaction.account_name}` : ''}
          </Text>
        </View>
        <Text style={styles.description}>{transaction.description}</Text>
        <Text
          style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}
        >
          {isIncome ? '+ ' : '- '}
          {formatMoney(transaction.amount)}
        </Text>
        <Text style={styles.date}>{isoToBr(transaction.date)}</Text>
      </Card>

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chips}>
        {options.map((category) => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[
                styles.chip,
                selected && {
                  backgroundColor: category.color,
                  borderColor: category.color,
                },
              ]}
            >
              <Ionicons
                name={safeIcon(category.icon)}
                size={16}
                color={selected ? '#FFFFFF' : category.color}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Salvar categoria"
        onPress={() => onSubmit(categoryId)}
        loading={submitting}
        disabled={categoryId === transaction.category_id}
      />
      <Text style={styles.note}>
        Lançamentos importados não podem ser editados nem excluídos. Para removê-los,
        desconecte o banco em Perfil → Contas bancárias.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  originText: { fontSize: 13, color: colors.muted },
  description: { fontSize: 18, fontWeight: '700', color: colors.text },
  amount: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  date: { fontSize: 14, color: colors.muted, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  note: { fontSize: 13, color: colors.muted, marginTop: spacing.md, lineHeight: 19 },
});
