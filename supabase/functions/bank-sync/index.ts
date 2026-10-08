// Importa as transações de uma conexão bancária para a tabela "transactions".
import { HttpError, handle, json, readBody, requireUser } from '../_shared/http.ts';
import {
  buildRange,
  describeItemProblem,
  mapTransaction,
} from '../_shared/openfinance.ts';
import type { ImportRow, SkipReason } from '../_shared/openfinance.ts';
import { getApiKey, getItem, listAccounts, listTransactions } from '../_shared/pluggy.ts';

Deno.serve(
  handle(async (req) => {
    const { supabase, user } = await requireUser(req);
    const body = await readBody(req);
    if (typeof body.item_id !== 'string' || body.item_id.length > 100) {
      throw new HttpError(400, 'item_id é obrigatório.');
    }

    const apiKey = await getApiKey();
    const item = await getItem(apiKey, body.item_id);

    // SEGURANÇA: nunca confie no item_id enviado pelo app. O item precisa ter
    // sido criado com o connect token DESTE usuário (clientUserId).
    if (item.clientUserId !== user.id) {
      throw new HttpError(403, 'Esta conexão não pertence à sua conta.');
    }

    const problem = describeItemProblem(item.status, item.executionStatus);
    if (problem) {
      await supabase
        .from('bank_connections')
        .update({ status: 'error', last_error: problem.message })
        .eq('pluggy_item_id', item.id);
      throw new HttpError(problem.httpStatus, problem.message);
    }

    const { data: connection, error: connError } = await supabase
      .from('bank_connections')
      .upsert(
        {
          pluggy_item_id: item.id,
          institution_name: item.connector.name,
          institution_image_url: item.connector.imageUrl ?? null,
          status: 'connected',
          last_error: null,
        },
        { onConflict: 'user_id,pluggy_item_id' },
      )
      .select('id, last_synced_at')
      .single();
    if (connError || !connection)
      throw connError ?? new Error('Falha ao salvar a conexão.');

    // Nome da categoria -> id (as categorias são as mesmas do app).
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, type');
    if (catError) throw catError;
    const categoryId = new Map(
      (categories ?? []).map((c) => [`${c.type}:${c.name}`, c.id as string]),
    );

    const range = buildRange(connection.last_synced_at, new Date());
    const skipped: Partial<Record<SkipReason, number>> = {};
    const rows: Record<string, unknown>[] = [];

    for (const account of await listAccounts(apiKey, item.id)) {
      for (const tx of await listTransactions(apiKey, account.id, range)) {
        const result = mapTransaction(tx, account.type);
        if ('skip' in result) {
          skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
          continue;
        }
        const row: ImportRow = result.row;
        const id = categoryId.get(`${row.type}:${row.categoryName}`);
        if (!id) continue; // categoria não cadastrada: não importa
        rows.push({
          category_id: id,
          type: row.type,
          description: row.description,
          amount: row.amount,
          date: row.date,
          source: 'open_finance',
          connection_id: connection.id,
          external_id: row.external_id,
          account_name: account.name?.slice(0, 60) ?? null,
        });
      }
    }

    // ignoreDuplicates: transações já importadas são ignoradas (e a categoria que o
    // usuário corrigiu não é sobrescrita). O retorno traz só as linhas NOVAS.
    let imported = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(rows.slice(i, i + 200), {
          onConflict: 'user_id,external_id',
          ignoreDuplicates: true,
        })
        .select('id');
      if (error) throw error;
      imported += data?.length ?? 0;
    }

    await supabase
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    return json({
      connection_id: connection.id,
      imported,
      fetched: rows.length,
      skipped,
    });
  }),
);
