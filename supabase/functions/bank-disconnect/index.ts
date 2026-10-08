// Revoga o acesso ao banco: apaga a conexão no Pluggy e os dados importados.
import { HttpError, handle, json, readBody, requireUser } from '../_shared/http.ts';
import { deleteItem, getApiKey } from '../_shared/pluggy.ts';

Deno.serve(
  handle(async (req) => {
    const { supabase } = await requireUser(req);
    const body = await readBody(req);
    if (typeof body.connection_id !== 'string') {
      throw new HttpError(400, 'connection_id é obrigatório.');
    }

    // O RLS garante que só enxergamos conexões do próprio usuário.
    const { data: connection } = await supabase
      .from('bank_connections')
      .select('id, pluggy_item_id')
      .eq('id', body.connection_id)
      .single();
    if (!connection) throw new HttpError(404, 'Conexão não encontrada.');

    // Primeiro o Pluggy: se falhar, não apagamos nada localmente e o usuário tenta de novo.
    await deleteItem(await getApiKey(), connection.pluggy_item_id);

    // "on delete cascade": os lançamentos importados desta conexão são removidos junto.
    const { error } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', connection.id);
    if (error) throw error;
    return json({ ok: true });
  }),
);
