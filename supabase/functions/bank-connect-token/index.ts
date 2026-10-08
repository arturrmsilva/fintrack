// Gera o Connect Token que o app usa para abrir o widget do Pluggy.
// O CLIENT_SECRET nunca sai daqui: o app recebe apenas um token de 30 minutos.
import { HttpError, handle, json, readBody, requireUser } from '../_shared/http.ts';
import { createConnectToken, getApiKey } from '../_shared/pluggy.ts';

Deno.serve(
  handle(async (req) => {
    const { user } = await requireUser(req);
    const body = await readBody(req);

    const redirect = body.redirect_uri;
    if (
      redirect !== undefined &&
      (typeof redirect !== 'string' || redirect.length > 300)
    ) {
      throw new HttpError(400, 'redirect_uri inválido.');
    }

    const apiKey = await getApiKey();
    // O clientUserId liga o item ao usuário: é a base da verificação na sincronização.
    const connectToken = await createConnectToken(apiKey, {
      clientUserId: user.id,
      ...(redirect ? { oauthRedirectUri: redirect } : {}),
    });
    return json({ connect_token: connectToken });
  }),
);
