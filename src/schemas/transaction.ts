import { z } from 'zod';
import { brToISO } from '@/utils/date';
import { parseMoney } from '@/utils/money';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z
    .string()
    .min(1, 'Informe o valor')
    .refine((v) => {
      const n = parseMoney(v);
      return !Number.isNaN(n) && n > 0;
    }, 'Valor inválido')
    .refine((v) => parseMoney(v) <= 9_999_999, 'Valor muito alto'),
  description: z
    .string()
    .trim()
    .min(2, 'Descreva com pelo menos 2 letras')
    .max(80, 'Máximo de 80 caracteres'),
  categoryId: z.string().min(1, 'Escolha uma categoria'),
  date: z.string().refine((v) => brToISO(v) !== null, 'Data inválida (DD/MM/AAAA)'),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
