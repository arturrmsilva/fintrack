import { supabase } from '@/lib/supabase';
import type { BankConnection, SyncResult } from '@/types';
import { invokeFunction } from './functions';

export async function listConnections(): Promise<BankConnection[]> {
  const { data, error } = await supabase
    .from('bank_connections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BankConnection[];
}

// Pede ao servidor um Connect Token (o segredo do Pluggy nunca fica no app).
export async function requestConnectToken(redirectUri: string): Promise<string> {
  const data = await invokeFunction<{ connect_token: string }>('bank-connect-token', {
    redirect_uri: redirectUri,
  });
  return data.connect_token;
}

export function syncConnection(itemId: string): Promise<SyncResult> {
  return invokeFunction<SyncResult>('bank-sync', { item_id: itemId });
}

export async function disconnectBank(connectionId: string): Promise<void> {
  await invokeFunction('bank-disconnect', { connection_id: connectionId });
}
