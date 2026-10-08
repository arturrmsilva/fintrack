// "false" desliga o modo de testes. Em qualquer outro caso, o widget mostra também os
// bancos de teste (Pluggy Bank), que não devem aparecer em produção.
export const OPEN_FINANCE_SANDBOX =
  process.env.EXPO_PUBLIC_OPEN_FINANCE_SANDBOX !== 'false';
