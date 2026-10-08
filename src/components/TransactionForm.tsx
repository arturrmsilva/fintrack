import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCategories } from '@/hooks/useCategories';
import { transactionSchema } from '@/schemas/transaction';
import type { TransactionFormData } from '@/schemas/transaction';
import { colors, radius, spacing } from '@/theme';
import type { Transaction, TransactionInput, TransactionType } from '@/types';
import { addDaysISO, brToISO, isoToBr, maskBrDate, todayISO } from '@/utils/date';
import { safeIcon } from '@/utils/icons';
import { parseMoney, roundMoney, toInputMoney } from '@/utils/money';
import { Button } from './Button';
import { FormInput } from './FormInput';

interface TransactionFormProps {
  initial?: Transaction;
  submitting: boolean;
  onSubmit: (input: TransactionInput) => void;
  onDelete?: () => void;
}

export function TransactionForm({
  initial,
  submitting,
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const { data: categories = [] } = useCategories();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initial?.type ?? 'expense',
      amount: initial ? toInputMoney(initial.amount) : '',
      description: initial?.description ?? '',
      categoryId: initial?.category_id ?? '',
      date: isoToBr(initial?.date ?? todayISO()),
    },
  });

  const type = watch('type');
  const categoryId = watch('categoryId');
  const options = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  // Ao trocar Receita/Despesa, descarta a categoria que não pertence ao novo tipo.
  useEffect(() => {
    const loaded = categories.length > 0;
    if (loaded && categoryId && !options.some((c) => c.id === categoryId)) {
      setValue('categoryId', '');
    }
  }, [categories.length, categoryId, options, setValue]);

  const submit = handleSubmit((values) => {
    onSubmit({
      type: values.type,
      amount: roundMoney(parseMoney(values.amount)),
      description: values.description.trim(),
      category_id: values.categoryId,
      date: brToISO(values.date) as string,
    });
  });

  const pickDate = (iso: string) =>
    setValue('date', isoToBr(iso), { shouldValidate: true, shouldDirty: true });

  return (
    <View>
      <View style={styles.segment}>
        <TypeButton
          label="Despesa"
          value="expense"
          current={type}
          onPick={(v) => setValue('type', v)}
        />
        <TypeButton
          label="Receita"
          value="income"
          current={type}
          onPick={(v) => setValue('type', v)}
        />
      </View>

      <FormInput
        control={control}
        name="amount"
        label="Valor (R$)"
        placeholder="0,00"
        keyboardType="decimal-pad"
      />
      <FormInput
        control={control}
        name="description"
        label="Descrição"
        placeholder="Ex.: Almoço, Salário, Uber"
        maxLength={80}
      />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chips}>
        {options.map((category) => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id}
              onPress={() =>
                setValue('categoryId', category.id, { shouldValidate: true })
              }
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
      {errors.categoryId ? (
        <Text style={styles.error}>{errors.categoryId.message}</Text>
      ) : null}

      <FormInput
        control={control}
        name="date"
        label="Data"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        mask={maskBrDate}
      />
      <View style={styles.quickDates}>
        <Button
          title="Hoje"
          variant="secondary"
          onPress={() => pickDate(todayISO())}
          style={styles.quick}
        />
        <Button
          title="Ontem"
          variant="secondary"
          onPress={() => pickDate(addDaysISO(todayISO(), -1))}
          style={styles.quick}
        />
      </View>

      <Button
        title={initial ? 'Salvar alterações' : 'Adicionar lançamento'}
        onPress={submit}
        loading={submitting}
      />
      {onDelete ? (
        <Button
          title="Excluir lançamento"
          variant="danger"
          onPress={onDelete}
          style={styles.delete}
        />
      ) : null}
    </View>
  );
}

interface TypeButtonProps {
  label: string;
  value: TransactionType;
  current: TransactionType;
  onPick: (value: TransactionType) => void;
}

function TypeButton({ label, value, current, onPick }: TypeButtonProps) {
  const active = value === current;
  const color = value === 'income' ? colors.income : colors.expense;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPick(value)}
      style={[styles.typeButton, active && { backgroundColor: color }]}
    >
      <Text style={[styles.typeText, active && styles.typeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { fontSize: 15, fontWeight: '700', color: colors.muted },
  typeTextActive: { color: '#FFFFFF' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  quickDates: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quick: { flex: 1, minHeight: 40 },
  delete: { marginTop: spacing.sm },
});
