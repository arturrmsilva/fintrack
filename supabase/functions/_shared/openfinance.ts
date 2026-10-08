// Regras puras da integração Open Finance: sem rede e sem Deno, testadas com Jest.

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Contas',
  'Outros',
] as const;

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Presentes',
  'Outros',
] as const;

export type Direction = 'income' | 'expense';
export type AccountKind = 'BANK' | 'CREDIT';

// Formato (parcial) de uma transação devolvida pela API do Pluggy.
export interface PluggyTransaction {
  id: string;
  description: string;
  currencyCode: string;
  amount: number;
  date: string;
  category?: string | null;
  type?: 'CREDIT' | 'DEBIT';
  status?: 'POSTED' | 'PENDING';
}

export interface ImportRow {
  external_id: string;
  type: Direction;
  description: string;
  amount: number;
  date: string; // AAAA-MM-DD
  categoryName: string;
}

export type SkipReason =
  | 'pending'
  | 'foreign_currency'
  | 'invalid'
  | 'card_bill_payment'
  | 'card_payment_received';

export type MapResult = { row: ImportRow } | { skip: SkipReason };

const round2 = (n: number) => Math.round(n * 100) / 100;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// A data do Pluggy vem em UTC. Bancos costumam enviar "meia-noite UTC" para datas
// sem horário: nesse caso o dia é o próprio. Com horário, convertemos para Brasília.
export function toBrazilDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  const base = isMidnightUtc ? date : new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return base.toISOString().slice(0, 10);
}

// A descrição precisa caber na regra do banco (2 a 80 caracteres).
export function cleanDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  return clean.length >= 2 ? clean : 'Transação bancária';
}

const RULES_EXPENSE: [string, string][] = [
  [
    'Alimentação',
    'eating out|restaurant|grocer|supermarket|food|bakery|padaria|' +
      'mercado|supermercado|restaurante|lanchonete|ifood|rappi|pizza|' +
      'hamburg|acougue|cafeteria|sorveteria|delivery',
  ],
  [
    'Transporte',
    'transport|taxi|ride-hailing|uber|99app|fuel|gas station|combust|posto|' +
      'estaciona|parking|toll|pedagio|metro|onibus|bilhete unico|' +
      'sem parar|veloe|conectcar',
  ],
  [
    'Saúde',
    'health|pharmacy|drugstore|farmacia|drogaria|drogasil|pacheco|' +
      'hospital|clinica|medic|dental|odonto|laborat|unimed|gym|academia',
  ],
  [
    'Educação',
    'education|school|tuition|course|curso|escola|faculdade|' +
      'universidade|livraria|udemy|alura|coursera',
  ],
  [
    'Lazer',
    'entertainment|streaming|netflix|spotify|disney|hbo|prime video|' +
      'youtube|cinema|ingresso|steam|playstation|xbox|leisure|travel|' +
      'viagem|hotel|airbnb|booking',
  ],
  ['Moradia', 'aluguel|mortgage|condominio|housing|iptu|reforma'],
  [
    'Contas',
    'utilities|bills|energia|enel|cemig|sabesp|copasa|internet|' +
      'telecom|vivo|claro|telefone|seguro|insurance|imposto|tarifa|' +
      'anuidade|boleto',
  ],
  [
    'Compras',
    'shopping|retail|clothing|electronics|online payment|amazon|' +
      'mercado livre|mercadolivre|magalu|americanas|shopee|shein|' +
      'aliexpress|renner|zara|loja',
  ],
];

const RULES_INCOME: [string, string][] = [
  [
    'Salário',
    'salary|payroll|wage|salario|folha de pagamento|proventos|' + 'remuneracao',
  ],
  [
    'Investimentos',
    'investment|dividend|interest|yield|rendimento|juros|resgate|cdb|' + 'tesouro',
  ],
  ['Freelance', 'freelance|prestacao de servico|honorarios'],
  ['Presentes', 'gift|presente'],
];

// Cada regra é uma lista de palavras separadas por "|".
function firstMatch(rules: [string, string][], text: string): string | null {
  for (const [category, words] of rules) {
    if (words.split('|').some((w) => text.includes(w))) return category;
  }
  return null;
}

// Categoria do Pluggy (quando existe) primeiro; depois palavras da descrição.
// É uma heurística: o usuário pode recategorizar no app.
export function suggestCategory(
  direction: Direction,
  pluggyCategory: string | null | undefined,
  description: string,
): string {
  const rules = direction === 'income' ? RULES_INCOME : RULES_EXPENSE;
  const fromCategory = pluggyCategory
    ? firstMatch(rules, normalize(pluggyCategory))
    : null;
  return fromCategory ?? firstMatch(rules, normalize(description)) ?? 'Outros';
}

// Textos já normalizados (minúsculas, sem acento). Ajuste se o seu banco escrever diferente.
const BILL_PAYMENT_ON_BANK =
  /(pag|pgto)\w*\.?\s*(de\s*)?(da\s*)?fatura|fatura\s*(do\s*)?cart/;
const PAYMENT_ON_CARD =
  /pagamento (recebido|efetuado)|payment received|(pag|pgto)\w*\.?\s*fatura/;

function direction(tx: PluggyTransaction, kind: AccountKind): Direction {
  if (tx.type === 'CREDIT') return 'income';
  if (tx.type === 'DEBIT') return 'expense';
  // Sem "type": em cartão, valor positivo é compra; em conta, valor positivo é entrada.
  if (kind === 'CREDIT') return tx.amount >= 0 ? 'expense' : 'income';
  return tx.amount >= 0 ? 'income' : 'expense';
}

// Converte uma transação do Pluggy em um lançamento do FinTrack (ou explica por que pular).
export function mapTransaction(tx: PluggyTransaction, kind: AccountKind): MapResult {
  if (tx.status === 'PENDING') return { skip: 'pending' };
  if (tx.currencyCode !== 'BRL') return { skip: 'foreign_currency' };

  const amount = round2(Math.abs(tx.amount));
  const date = toBrazilDate(tx.date);
  if (!tx.id || !date || !Number.isFinite(amount) || amount <= 0)
    return { skip: 'invalid' };

  const type = direction(tx, kind);
  const text = normalize(tx.description);

  // Evita contar duas vezes: a compra no cartão já é uma despesa.
  if (kind === 'BANK' && type === 'expense' && BILL_PAYMENT_ON_BANK.test(text)) {
    return { skip: 'card_bill_payment' };
  }
  if (kind === 'CREDIT' && type === 'income' && PAYMENT_ON_CARD.test(text)) {
    return { skip: 'card_payment_received' };
  }

  return {
    row: {
      external_id: tx.id,
      type,
      description: cleanDescription(tx.description),
      amount,
      date,
      categoryName: suggestCategory(type, tx.category, tx.description),
    },
  };
}

const DAY = 24 * 60 * 60 * 1000;

// Janela de busca: 90 dias na primeira vez; depois, desde a última sincronização
// menos 7 dias (o banco pode confirmar transações com atraso).
export function buildRange(lastSyncedAt: string | null, now: Date) {
  const last = lastSyncedAt ? new Date(lastSyncedAt) : null;
  const start =
    last && !Number.isNaN(last.getTime())
      ? new Date(last.getTime() - 7 * DAY)
      : new Date(now.getTime() - 90 * DAY);
  return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

// Mensagem para o usuário quando a conexão não está pronta; null = pode importar.
export function describeItemProblem(
  status: string,
  executionStatus?: string | null,
): { message: string; httpStatus: number } | null {
  if (status === 'UPDATED') return null;
  if (status === 'LOGIN_ERROR') {
    const byExecution: Record<string, string> = {
      USER_AUTHORIZATION_NOT_GRANTED: 'Você não autorizou o compartilhamento dos dados.',
      USER_AUTHORIZATION_REVOKED:
        'O consentimento foi revogado no banco. Conecte novamente.',
      INVALID_CREDENTIALS: 'As credenciais informadas são inválidas.',
    };
    return {
      message:
        byExecution[executionStatus ?? ''] ??
        'Não foi possível entrar no banco. Conecte novamente.',
      httpStatus: 422,
    };
  }
  if (status === 'OUTDATED') {
    return {
      message: 'O banco está instável no momento. Tente novamente mais tarde.',
      httpStatus: 502,
    };
  }
  return {
    message:
      'A conexão ainda está sendo processada. Aguarde um instante e tente de novo.',
    httpStatus: 409,
  };
}
