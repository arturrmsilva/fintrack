// Utilitários comuns das Edge Functions: CORS, respostas JSON e autenticação.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// Erro "esperado": a mensagem pode ser mostrada ao usuário.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Envolve o tratamento comum: CORS, método POST e conversão de erros em respostas.
export function handle(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Falha inesperada. Tente novamente.' }, 500);
    }
  };
}

// Cria um cliente que age COMO O USUÁRIO: o RLS continua valendo dentro da função.
export async function requireUser(
  req: Request,
): Promise<{ supabase: SupabaseClient; user: User }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new HttpError(401, 'Não autenticado.');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sessão inválida. Entre novamente.');
  return { supabase, user: data.user };
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (typeof body === 'object' && body !== null) return body as Record<string, unknown>;
  } catch {
    // cai no erro abaixo
  }
  throw new HttpError(400, 'Corpo da requisição inválido.');
}
