import type { Transaction } from '@/types';
import { isoToBr } from './date';

// Evita que o Excel interprete o texto como fórmula (=, +, -, @).
function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Separador ";" e vírgula decimal: abre corretamente no Excel em português.
export function toCsv(transactions: Transaction[]): string {
  const header = 'data;tipo;categoria;descricao;valor';
  const rows = transactions.map((t) =>
    [
      isoToBr(t.date),
      t.type === 'income' ? 'Receita' : 'Despesa',
      cell(t.category?.name ?? ''),
      cell(t.description),
      t.amount.toFixed(2).replace('.', ','),
    ].join(';'),
  );
  return [header, ...rows].join('\n');
}
