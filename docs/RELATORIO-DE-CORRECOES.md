# Relatório de desenvolvimento e correções — FinTrack

Este documento atende ao requisito de registrar **todas as soluções de correção apresentadas durante o desenvolvimento**: erros, prompts utilizados, respostas das IAs e como a solução foi implementada para seguir com o projeto.

- **Projeto:** FinTrack — Gerenciador Financeiro Pessoal (diferencial: integração Open Finance)
- **Escopo de entrega:** APK para Android
- **Data da construção:** 7 de outubro de 2026
- **Fonte do roteiro:** guia "FinTrack — Guia de construção passo a passo" (123 páginas, 17 etapas)
- **Assistente de IA:** Claude (Anthropic)

## 1. Prompt utilizado

| # | Prompt (resumo) | Resposta / ação da IA |
| --- | --- | --- |
| 1 | Enviou o enunciado (imagem) e o guia em PDF. Pediu: "faça esse projeto, documente tudo que fizemos (README?) e dessa vez vamos subir para o GitHub". | Leu o PDF inteiro, extraiu programaticamente os 70 arquivos de código dos blocos "Código N", montou o projeto, validou com typecheck, testes e bundle Android, e produziu README e este relatório. |

Decisão de documentação: **README.md** na raiz (vitrine do projeto) + **este relatório** em `docs/` (histórico técnico). O README aponta para o relatório.

## 2. Linha do tempo do que foi feito

1. Leitura do enunciado e do guia (etapas 1 a 17).
2. Criação do projeto com `create-expo-app` (template `blank-typescript`, Expo SDK 57, React Native 0.86).
3. Instalação das bibliotecas das etapas 2 e 15.
4. Extração dos blocos de código do PDF e geração dos arquivos nos caminhos indicados.
5. Ajustes de `package.json`, `app.json`, `tsconfig.json`, `.gitignore` e `eas.json`.
6. Validação: `typecheck`, `jest`, `prettier` e `expo export` (Android).
7. Escrita do README e deste relatório; preparação do repositório Git.

## 3. Problemas encontrados e soluções

### 3.1 `npx expo install` falha com "Unexpected token 'H', "Host not i"... is not valid JSON"

- **Sintoma:** ao rodar `npx expo install expo-router ...`, o comando aborta com `SyntaxError` e a mensagem "Unable to fetch compatibility data".
- **Causa:** o comando consulta a API da Expo (`api.expo.dev`) para descobrir versões compatíveis. No ambiente de construção, essa API estava bloqueada pelo proxy de rede e devolveu "Host not in allowlist" em vez de JSON.
- **Solução:** ler as versões compatíveis do arquivo local `node_modules/expo/bundledNativeModules.json` (mesma fonte usada pelo `expo install`) e instalar com `npm install pacote@versão`. Exemplo: `expo-router@~57.0.25`, `react-native-screens@~4.26.0`, `react-native-svg@15.15.4`.
- **Para você (máquina com internet):** o comando do guia funciona normalmente; se quiser garantir, rode `npx expo install --fix` depois.

### 3.2 Bloco "trecho" sobrescreveu o arquivo inteiro (`summary.test.ts`)

- **Sintoma:** `npm run typecheck` acusou `Cannot find name 'Transaction'` e o Jest respondeu "Your test suite must contain at least one test" para `summary.test.ts`.
- **Causa:** o guia traz o Código 65 apenas como **trecho** (a função `make` do teste), mas o script de extração tratou todo bloco com caminho como arquivo completo e sobrescreveu `__tests__/summary.test.ts` com 17 linhas.
- **Solução:** adicionar o Código 65 à lista de blocos ignorados. O Código 21 já traz a função `make` com os quatro campos novos (`source`, `connection_id`, `external_id`, `account_name`), então nada se perde.
- **Prevenção:** blocos marcados como "(trechos)", "(linha do …)", "(função …)", "(acrescente …)" ou com rótulo `undefined` são tratados à parte (Códigos 1, 2, 3, 6, 57, 65, 69, 70, 71).
- **Resultado:** typecheck sem erros e 46 testes passando.

### 3.3 Códigos 69, 70 e 71 aparecem com rótulo "undefined"

- **Sintoma:** no guia, três blocos da Etapa 15.4 não têm caminho ("Código 69 · undefined").
- **Causa:** são acréscimos a arquivos existentes (`src/services/transactions.ts`, `src/hooks/useTransactions.ts`, `src/utils/date.ts`).
- **Solução:** conferido que `updateTransactionCategory`, `useRecategorizeTransaction` e `formatDateTime` **já constam** nas versões completas dos Códigos 25, 27 e 16. Os três blocos foram ignorados para não duplicar funções.

### 3.4 Arquivos substituídos ao longo do guia

Alguns arquivos aparecem mais de uma vez (versão da etapa base e versão final com Open Finance). A montagem aplica os blocos na ordem do guia, então **vale a versão mais recente**:

| Arquivo | Versões | Vale |
| --- | --- | --- |
| `src/types/index.ts` | Código 9 e 64 | 64 |
| `src/components/TransactionItem.tsx` | Código 45 e 74 | 74 |
| `app/(app)/_layout.tsx` | Código 39 e 78 | 78 |
| `app/(app)/transaction/[id].tsx` | Código 48 e 79 | 79 |
| `app/(app)/(tabs)/profile.tsx` | Código 41 e 80 | 80 |
| `tsconfig.json` | Código 3 e 56 | 56 |

As telas provisórias (Código 7, `app/index.tsx`, e Código 42) não foram criadas, porque já existem as telas definitivas.

### 3.5 Inconsistências do guia (sem impacto no resultado)

- A saída esperada dos testes na Etapa 13 lista `__tests__/parse.test.ts`, que não existe neste projeto (resquício de outro projeto). O resultado real é **4 suítes e 46 testes**.
- O Código 39 (Etapa 8) já registra as rotas `banks/*` no layout, antes de elas existirem (Etapa 15). Como todas as telas já estão presentes na versão final, não há aviso de rota inexistente.
- O Código 2 do guia usa o pacote `br.edu.iesb.bruno.fintrack`. Foi trocado por `br.edu.iesb.artur.fintrack`, como o próprio guia orienta (identificador único por aluno).

### 3.6 Template do Expo vs. o guia

- O template cria `App.tsx` e `index.ts`. Foram apagados, e `main` passou a `expo-router/entry`, como manda a Etapa 2.
- Foram mantidos os caminhos de ícones gerados pelo template no `app.json`, conforme o aviso do guia.
- O `tsconfig.json` exclui os arquivos Deno das Edge Functions da checagem do app, evitando erros falsos do TypeScript.

## 4. Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Sem erros |
| `npm test` | 4 suítes, 46 testes passando (24 do app base + 22 de Open Finance) |
| `npm run format` | Código formatado (Prettier) |
| `npx expo export --platform android` | Bundle Hermes gerado com sucesso (≈ 5,2 MB) |

## 5. O que NÃO foi possível validar neste ambiente

Para ser transparente sobre os limites desta construção:

- **Edge Functions (Deno):** o Deno não estava disponível; as funções foram extraídas do guia mas não executadas nem publicadas.
- **Supabase e Pluggy:** exigem contas e credenciais próprias. O schema SQL e os fluxos de login, lançamentos e Open Finance não foram testados contra um backend real.
- **APK:** o build exige login na Expo (EAS) ou o Android SDK local; não foi gerado aqui. O perfil `preview` de `eas.json` já está pronto (ver README).
- **Capturas de tela e GIF:** dependem do app rodando em um aparelho.
- **Envio ao GitHub:** exige a sua autenticação; o repositório foi preparado com commits, mas o `git push` precisa ser feito por você.

## 6. Checklist para concluir (ação sua)

1. Criar o projeto no Supabase e rodar `supabase/schema.sql` e depois `supabase/open-finance.sql`.
2. Criar `.env` a partir de `.env.example` com a URL e a chave pública.
3. Criar a aplicação no Pluggy, definir os segredos e publicar as três Edge Functions (README, passo 4).
4. Rodar o roteiro de validação das Etapas 11 e 16 do guia no celular.
5. Gerar o APK: `eas build --platform android --profile preview`.
6. Adicionar capturas de tela em `docs/` e ao README.
7. Publicar no GitHub (comandos na resposta de entrega).

## 7. Registro de novos problemas

Use a tabela abaixo para anotar os erros que aparecerem nas próximas etapas (Supabase, Pluggy, APK), mantendo o histórico exigido pelo enunciado.

| Data | Erro / sintoma | Prompt usado | Resposta da IA (resumo) | Como foi implementado |
| --- | --- | --- | --- | --- |
| | | | | |
