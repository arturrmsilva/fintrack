import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Chama uma Edge Function e devolve a mensagem que a FUNÇÃO escreveu quando ela falha
// (em vez do texto genérico "Edge Function returned a non-2xx status code").
export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (!error) return data as T;

  let message = error.message;
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (typeof payload?.error === 'string') message = payload.error;
    } catch {
      // mantém a mensagem genérica
    }
  }
  throw new Error(message);
}
