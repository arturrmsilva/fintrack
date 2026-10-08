import type { Transaction, TransactionType } from '@/types';

export interface CategoryTotal {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percent: number; // 0 a 100, sobre o total de despesas
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  byCategory: CategoryTotal[];
}

// Soma em centavos (inteiros) para evitar erros de ponto flutuante.
export function summarize(transactions: Transaction[]): Summary {
  let income = 0;
  let expense = 0;
  const totals = new Map<string, CategoryTotal>();

  for (const t of transactions) {
    const cents = Math.round(t.amount * 100);
    if (t.type === 'income') {
      income += cents;
      continue;
    }
    expense += cents;
    const id = t.category?.id ?? 'none';
    const current = totals.get(id) ?? {
      categoryId: id,
      name: t.category?.name ?? 'Sem categoria',
      color: t.category?.color ?? '#94A3B8',
      icon: t.category?.icon ?? 'pricetag',
      total: 0,
      percent: 0,
    };
    current.total += cents;
    totals.set(id, current);
  }

  const byCategory = Array.from(totals.values())
    .map((c) => ({
      ...c,
      total: c.total / 100,
      percent: expense > 0 ? (c.total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    income: income / 100,
    expense: expense / 100,
    balance: (income - expense) / 100,
    byCategory,
  };
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function filterTransactions(
  list: Transaction[],
  type: 'all' | TransactionType,
  query: string,
): Transaction[] {
  const q = normalize(query.trim());
  return list.filter((t) => {
    if (type !== 'all' && t.type !== type) return false;
    if (!q) return true;
    return normalize(`${t.description} ${t.category?.name ?? ''}`).includes(q);
  });
}

export interface DayGroup {
  date: string;
  data: Transaction[];
}

// Agrupa por dia mantendo a ordem recebida (o servidor já ordena por data).
export function groupByDate(list: Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of list) {
    const day = groups.get(t.date);
    if (day) day.push(t);
    else groups.set(t.date, [t]);
  }
  return Array.from(groups, ([date, data]) => ({ date, data }));
}
