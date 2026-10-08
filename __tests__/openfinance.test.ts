import {
  buildRange,
  cleanDescription,
  describeItemProblem,
  mapTransaction,
  suggestCategory,
  toBrazilDate,
} from '../supabase/functions/_shared/openfinance';
import type { PluggyTransaction } from '../supabase/functions/_shared/openfinance';

function tx(partial: Partial<PluggyTransaction> = {}): PluggyTransaction {
  return {
    id: 'tx-1',
    description: 'Compra Mercado Bom Preço',
    currencyCode: 'BRL',
    amount: -45.9,
    date: '2026-09-10T00:00:00.000Z',
    type: 'DEBIT',
    status: 'POSTED',
    ...partial,
  };
}

describe('toBrazilDate', () => {
  it('mantém o dia quando a data vem à meia-noite UTC', () => {
    expect(toBrazilDate('2026-09-10T00:00:00.000Z')).toBe('2026-09-10');
  });

  it('converte para o horário de Brasília quando há hora', () => {
    expect(toBrazilDate('2026-09-10T01:30:00.000Z')).toBe('2026-09-09');
    expect(toBrazilDate('2026-09-10T15:00:00.000Z')).toBe('2026-09-10');
  });

  it('devolve null para datas inválidas', () => {
    expect(toBrazilDate('ontem')).toBeNull();
  });
});

describe('cleanDescription', () => {
  it('normaliza espaços e limita a 80 caracteres', () => {
    expect(cleanDescription('  PIX   ENVIADO  ')).toBe('PIX ENVIADO');
    expect(cleanDescription('x'.repeat(200))).toHaveLength(80);
  });

  it('usa um texto padrão quando a descrição é curta demais', () => {
    expect(cleanDescription(' a ')).toBe('Transação bancária');
  });
});

describe('suggestCategory', () => {
  it('prefere a categoria do Pluggy', () => {
    expect(suggestCategory('expense', 'Eating out', 'COMPRA 123')).toBe('Alimentação');
    expect(suggestCategory('expense', 'Health', 'PAGTO 999')).toBe('Saúde');
  });

  it('usa palavras da descrição quando não há categoria', () => {
    expect(suggestCategory('expense', null, 'IFOOD *PEDIDO')).toBe('Alimentação');
    expect(suggestCategory('expense', null, 'Drogaria São Paulo')).toBe('Saúde');
    expect(suggestCategory('expense', undefined, 'NETFLIX.COM')).toBe('Lazer');
    expect(suggestCategory('income', null, 'Salário Setembro')).toBe('Salário');
  });

  it('cai em "Outros" quando nada combina', () => {
    expect(suggestCategory('expense', null, 'XYZ 123')).toBe('Outros');
    expect(suggestCategory('income', 'Transfer', 'TED recebida')).toBe('Outros');
  });

  it('usa as regras certas para cada direção', () => {
    expect(suggestCategory('income', null, 'Rendimentos CDB')).toBe('Investimentos');
    expect(suggestCategory('expense', null, 'Rendimentos CDB')).toBe('Outros');
  });
});

describe('mapTransaction', () => {
  it('converte uma despesa: valor positivo e categoria sugerida', () => {
    const result = mapTransaction(tx(), 'BANK');
    expect(result).toEqual({
      row: {
        external_id: 'tx-1',
        type: 'expense',
        description: 'Compra Mercado Bom Preço',
        amount: 45.9,
        date: '2026-09-10',
        categoryName: 'Alimentação',
      },
    });
  });

  it('converte uma receita usando o campo type', () => {
    const result = mapTransaction(
      tx({ type: 'CREDIT', amount: 3000, description: 'Salário' }),
      'BANK',
    );
    expect(result).toMatchObject({
      row: { type: 'income', amount: 3000, categoryName: 'Salário' },
    });
  });

  it('deduz a direção pelo sinal quando não há type', () => {
    expect(mapTransaction(tx({ type: undefined, amount: -10 }), 'BANK')).toMatchObject({
      row: { type: 'expense' },
    });
    expect(mapTransaction(tx({ type: undefined, amount: 10 }), 'BANK')).toMatchObject({
      row: { type: 'income' },
    });
    // No cartão, valor positivo é compra.
    expect(mapTransaction(tx({ type: undefined, amount: 10 }), 'CREDIT')).toMatchObject({
      row: { type: 'expense' },
    });
  });

  it('pula transações pendentes, em moeda estrangeira, zeradas ou sem data', () => {
    expect(mapTransaction(tx({ status: 'PENDING' }), 'BANK')).toEqual({
      skip: 'pending',
    });
    expect(mapTransaction(tx({ currencyCode: 'USD' }), 'BANK')).toEqual({
      skip: 'foreign_currency',
    });
    expect(mapTransaction(tx({ amount: 0 }), 'BANK')).toEqual({ skip: 'invalid' });
    expect(mapTransaction(tx({ date: 'x' }), 'BANK')).toEqual({ skip: 'invalid' });
  });

  it('não conta duas vezes: pagamento de fatura na conta é ignorado', () => {
    const bill = tx({ description: 'PAGAMENTO DE FATURA CARTÃO', amount: -1200 });
    expect(mapTransaction(bill, 'BANK')).toEqual({ skip: 'card_bill_payment' });
  });

  it('no cartão, ignora o pagamento recebido mas mantém estornos', () => {
    const payment = tx({
      type: 'CREDIT',
      amount: -1200,
      description: 'Pagamento recebido',
    });
    expect(mapTransaction(payment, 'CREDIT')).toEqual({ skip: 'card_payment_received' });

    const refund = tx({ type: 'CREDIT', amount: -80, description: 'Estorno Loja X' });
    expect(mapTransaction(refund, 'CREDIT')).toMatchObject({
      row: { type: 'income', amount: 80 },
    });
  });

  it('arredonda o valor para centavos', () => {
    expect(mapTransaction(tx({ amount: -0.1 - 0.2 }), 'BANK')).toMatchObject({
      row: { amount: 0.3 },
    });
  });
});

describe('buildRange', () => {
  const now = new Date('2026-09-19T12:00:00Z');

  it('na primeira vez busca 90 dias', () => {
    expect(buildRange(null, now)).toEqual({ from: '2026-06-21', to: '2026-09-19' });
  });

  it('depois, busca desde a última sincronização menos 7 dias', () => {
    expect(buildRange('2026-09-15T10:00:00Z', now)).toEqual({
      from: '2026-09-08',
      to: '2026-09-19',
    });
  });

  it('ignora datas de sincronização inválidas', () => {
    expect(buildRange('lixo', now).from).toBe('2026-06-21');
  });
});

describe('describeItemProblem', () => {
  it('libera a importação quando a conexão está atualizada', () => {
    expect(describeItemProblem('UPDATED', 'SUCCESS')).toBeNull();
    expect(describeItemProblem('UPDATED', 'PARTIAL_SUCCESS')).toBeNull();
  });

  it('explica consentimento negado ou revogado', () => {
    expect(
      describeItemProblem('LOGIN_ERROR', 'USER_AUTHORIZATION_REVOKED'),
    ).toMatchObject({
      httpStatus: 422,
      message: expect.stringContaining('revogado'),
    });
  });

  it('diferencia banco instável de conexão em andamento', () => {
    expect(describeItemProblem('OUTDATED')?.httpStatus).toBe(502);
    expect(describeItemProblem('UPDATING')?.httpStatus).toBe(409);
  });
});
