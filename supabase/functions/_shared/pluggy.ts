// Cliente mínimo da API do Pluggy. Roda SOMENTE no servidor (Edge Functions).
// CLIENT_ID e CLIENT_SECRET são segredos: nunca podem ir para o app.
import { HttpError } from './http.ts';
import type { PluggyTransaction } from './openfinance.ts';

const BASE = 'https://api.pluggy.ai';

export interface PluggyItem {
  id: string;
  status: string;
  executionStatus: string | null;
  clientUserId: string | null;
  connector: { name: string; imageUrl?: string | null };
}

export interface PluggyAccount {
  id: string;
  type: 'BANK' | 'CREDIT';
  name: string;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  apiKey?: string,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 404)
    throw new HttpError(404, 'Conexão não encontrada no Pluggy.');
  if (!response.ok) {
    console.error(
      `Pluggy ${path} respondeu ${response.status}: ${await response.text()}`,
    );
    throw new HttpError(
      502,
      'O serviço de Open Finance não respondeu. Tente mais tarde.',
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

// A chave de API vale 2 horas; como a função é curta, pedimos uma a cada chamada.
export async function getApiKey(): Promise<string> {
  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.error('PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configurados.');
    throw new HttpError(500, 'Integração com o banco não configurada no servidor.');
  }
  const data = await request<{ apiKey: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientSecret }),
  });
  return data.apiKey;
}

// O Connect Token vale 30 minutos e só enxerga os itens criados com ele.
// clientUserId FICA DENTRO de "options" (fora dele, o Pluggy descarta em silêncio).
export async function createConnectToken(
  apiKey: string,
  options: { clientUserId: string; oauthRedirectUri?: string },
): Promise<string> {
  const data = await request<{ accessToken: string }>(
    '/connect_token',
    {
      method: 'POST',
      body: JSON.stringify({ options: { ...options, avoidDuplicates: true } }),
    },
    apiKey,
  );
  return data.accessToken;
}

export const getItem = (apiKey: string, id: string) =>
  request<PluggyItem>(`/items/${encodeURIComponent(id)}`, {}, apiKey);

export async function listAccounts(
  apiKey: string,
  itemId: string,
): Promise<PluggyAccount[]> {
  const data = await request<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    {},
    apiKey,
  );
  return data.results ?? [];
}

// Percorre todas as páginas de transações da conta no período.
export async function listTransactions(
  apiKey: string,
  accountId: string,
  range: { from: string; to: string },
): Promise<PluggyTransaction[]> {
  const pageSize = 500;
  const all: PluggyTransaction[] = [];
  for (let page = 1; page <= 20; page++) {
    const query = new URLSearchParams({
      accountId,
      from: range.from,
      to: range.to,
      pageSize: String(pageSize),
      page: String(page),
    });
    const data = await request<{ results: PluggyTransaction[]; totalPages?: number }>(
      `/transactions?${query}`,
      {},
      apiKey,
    );
    all.push(...(data.results ?? []));
    if ((data.results ?? []).length < pageSize || page >= (data.totalPages ?? page))
      break;
  }
  return all;
}

// Revogar de verdade: apaga a conexão no Pluggy (404 = já não existe).
export async function deleteItem(apiKey: string, id: string): Promise<void> {
  try {
    await request<void>(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }, apiKey);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return;
    throw err;
  }
}
