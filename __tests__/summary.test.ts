import type { Category, Transaction } from '@/types';
import { toCsv } from '@/utils/csv';
import { filterTransactions, groupByDate, summarize } from '@/utils/summary';

const food: Category = {
  id: 'c1',
  name: 'Alimentação',
  type: 'expense',
  icon: 'restaurant',
  color: '#F97316',
};
const transport: Category = {
  id: 'c2',
  name: 'Transporte',
  type: 'expense',
  icon: 'car',
  color: '#3B82F6',
};
const salary: Category = {
  id: 'c3',
  name: 'Salário',
  type: 'income',
  icon: 'cash',
  color: '#16A34A',
};

function make(partial: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction {
  return {
    user_id: 'u1',
    category_id: 'c1',
    type: 'expense',
    description: 'Teste',
    amount: 10,
    date: '2026-09-10',
    created_at: '2026-09-10T12:00:00Z',
    category: food,
    source: 'manual',
    connection_id: null,
    external_id: null,
    account_name: null,
    ...partial,
  };
}

const list: Transaction[] = [
  make({
    id: '1',
    type: 'income',
    amount: 3000,
    description: 'Salário',
    category: salary,
    date: '2026-09-05',
  }),
  make({ id: '2', amount: 0.1, description: 'Bala', category: food, date: '2026-09-10' }),
  make({
    id: '3',
    amount: 0.2,
    description: 'Chiclete',
    category: food,
    date: '2026-09-10',
  }),
  make({
    id: '4',
    amount: 99.7,
    description: 'Ônibus',
    category: transport,
    date: '2026-09-09',
  }),
];

describe('summarize', () => {
  it('soma receitas, despesas e saldo sem erro de ponto flutuante', () => {
    const s = summarize(list);
    expect(s.income).toBe(3000);
    expect(s.expense).toBe(100);
    expect(s.balance).toBe(2900);
  });

  it('soma valores decimais sem o erro clássico de 0.1 + 0.2', () => {
    const s = summarize([make({ id: 'a', amount: 0.1 }), make({ id: 'b', amount: 0.2 })]);
    expect(s.expense).toBe(0.3);
  });

  it('agrupa despesas por categoria, da maior para a menor', () => {
    const s = summarize(list);
    expect(s.byCategory.map((c) => c.name)).toEqual(['Transporte', 'Alimentação']);
    expect(s.byCategory[0].percent).toBeCloseTo(99.7, 1);
    expect(s.byCategory[1].percent).toBeCloseTo(0.3, 1);
  });

  it('funciona com lista vazia', () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, balance: 0, byCategory: [] });
  });
});

describe('filterTransactions', () => {
  it('filtra por tipo', () => {
    expect(filterTransactions(list, 'income', '').map((t) => t.id)).toEqual(['1']);
  });

  it('busca ignorando acentos e maiúsculas', () => {
    expect(filterTransactions(list, 'all', 'onibus').map((t) => t.id)).toEqual(['4']);
    expect(filterTransactions(list, 'all', 'ALIMENTACAO').map((t) => t.id)).toEqual([
      '2',
      '3',
    ]);
  });
});

describe('groupByDate', () => {
  it('agrupa por dia mantendo a ordem', () => {
    const groups = groupByDate([list[1], list[2], list[3], list[0]]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-10', '2026-09-09', '2026-09-05']);
    expect(groups[0].data).toHaveLength(2);
  });
});

describe('toCsv', () => {
  it('gera cabeçalho e linhas no padrão brasileiro', () => {
    const csv = toCsv([list[0]]);
    expect(csv.split('\n')).toEqual([
      'data;tipo;categoria;descricao;valor',
      '05/09/2026;Receita;"Salário";"Salário";3000,00',
    ]);
  });

  it('neutraliza fórmulas e escapa aspas', () => {
    const csv = toCsv([make({ id: '9', description: '=1+1 "x"' })]);
    expect(csv).toContain(`"'=1+1 ""x"""`);
  });
});
