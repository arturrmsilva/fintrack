# FinTrack — Gerenciador Financeiro Pessoal

Aplicativo mobile de finanças pessoais: registre receitas e despesas, **importe lançamentos direto do seu banco via Open Finance** e acompanhe para onde o dinheiro está indo.

> **Diferencial:** integração com Open Finance (somente leitura), com credenciais do agregador mantidas apenas no servidor.
> **Plataforma:** por enquanto, apenas **APK para instalação via Android** (o código também roda no Expo Go).

Projeto da disciplina de Programação para Dispositivos Móveis, construído de forma guiada a partir do guia "FinTrack — Guia de construção passo a passo" (Prof. Me. Bruno Assunção Dias, IESB, setembro de 2026).

## Funcionalidades

- Cadastro, login e sessão persistente (Supabase Auth)
- Lançamentos de receitas e despesas: criar, editar e excluir
- **Open Finance:** conexão com bancos via Pluggy, importação de extratos e faturas (somente leitura), sincronização sem duplicar e revogação que apaga os dados importados
- Painel mensal com saldo, receitas, despesas e gráfico de rosca por categoria (desenhado à mão com SVG)
- Lista agrupada por dia, com busca (sem acento) e filtro por tipo
- Exportação dos lançamentos em CSV, com proteção contra injeção de fórmula
- Dados isolados por usuário com Row Level Security (RLS)

## Tecnologias

React Native · Expo SDK 57 · Expo Router · TypeScript · Supabase (Auth, PostgreSQL, RLS, Edge Functions em Deno) · Pluggy (agregador Open Finance) · TanStack Query · React Hook Form · Zod · react-native-svg · Jest

## Arquitetura

Regra de ouro: a tela nunca fala direto com o Supabase. O caminho é sempre **tela → hook → serviço → banco**.

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Rotas e telas | `app/` | Cada arquivo é uma rota |
| Componentes | `src/components/` | Interface reutilizável, sem regra de negócio |
| Hooks | `src/hooks/` | Consultas e mutações com cache (TanStack Query) |
| Serviços | `src/services/` | Único lugar que conversa com o Supabase |
| Regras puras | `src/utils/` | Dinheiro, datas, resumos e CSV (testadas) |
| Validação | `src/schemas/` | Regras dos formulários (Zod) |
| Contexto | `src/context/` | Sessão do usuário |
| Funções de servidor | `supabase/functions/` | Tudo que exige segredo (Pluggy) |

### Como o Open Finance funciona aqui

```
app -> bank-connect-token -> Pluggy (Connect Token de 30 min)
app -> widget do Pluggy   -> consentimento no banco
app -> bank-sync          -> Pluggy -> regras puras -> tabela transactions
```

As credenciais do Pluggy ficam só no servidor. A função `bank-sync` confere que a conexão pertence ao usuário logado (`clientUserId`) antes de importar. O pagamento de fatura de cartão não é contado em dobro.

## Como executar

1. Instale as dependências: `npm install`
2. Crie um projeto no [Supabase](https://supabase.com) e execute, nesta ordem, `supabase/schema.sql` e `supabase/open-finance.sql` no SQL Editor.
3. Copie `.env.example` para `.env` e preencha a URL e a chave pública (nunca use a `service_role` no app).
4. Open Finance (opcional): crie uma aplicação em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) e publique as funções:
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU-PROJECT-REF
   npx supabase secrets set PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=...
   npx supabase functions deploy bank-connect-token
   npx supabase functions deploy bank-sync
   npx supabase functions deploy bank-disconnect
   ```
5. Inicie o app: `npx expo start` e abra no Expo Go. Banco de teste do Pluggy: usuário `user-ok`, senha `password-ok`, MFA `123456`.

## Gerar o APK (Android)

O build é feito na nuvem da Expo (EAS). O perfil `preview` em `eas.json` já está configurado para gerar um `.apk`.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Antes, cadastre no painel da Expo (expo.dev → Environment variables → ambiente `preview`) as variáveis `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` e `EXPO_PUBLIC_OPEN_FINANCE_SANDBOX` (`false` para produção). O `.env` não vai para a nuvem porque está no `.gitignore`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o servidor do Expo |
| `npm test` | Executa os 46 testes unitários |
| `npm run typecheck` | Verifica os tipos com o TypeScript |
| `npm run format` | Formata o código (Prettier) |

## Qualidade

- `npm run typecheck`: sem erros
- `npm test`: 4 suítes, 46 testes passando
- `npx expo export --platform android`: bundle gerado com sucesso
- Segredos fora do Git (`.env` ignorado, `.env.example` versionado)

## Documentação do desenvolvimento

O relatório com os erros encontrados, as correções aplicadas, os prompts utilizados e como cada solução foi implementada está em [`docs/RELATORIO-DE-CORRECOES.md`](docs/RELATORIO-DE-CORRECOES.md).

## Autor

Artur Martins · [GitHub](https://github.com/arturrmsilva) · [LinkedIn](https://linkedin.com/in/artur-martins-5a7b3436a/)
