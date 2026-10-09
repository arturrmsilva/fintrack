# 🛠️ Guia de Solução de Problemas (Troubleshooting) - FinTrack

Este documento reúne os principais erros enfrentados durante a configuração e desenvolvimento do FinTrack, acompanhados de suas respectivas soluções práticas.

---

## 1. Erro: "Variáveis do Supabase ausentes" ou Telas sem Exportação Padrão

### Sintoma
O terminal exibe `Error: Variáveis do Supabase ausentes` repetidamente ou surgem avisos amarelados (`WARN Route ... is missing the required default export`).

### Causa
O arquivo `src/lib/supabase.ts` tenta inicializar a conexão no momento da inicialização do app, mas o Metro Bundler não encontrou as variáveis no arquivo `.env` ou usou uma versão antiga em cache.

### Solução
1. Certifique-se de que o arquivo de variáveis na raiz chama-se exatamente `.env` (e não `.env.example` ou `.env.txt`).
2. Defina **ambos** os nomes de chaves públicas dentro do `.env` para evitar discrepâncias de importação:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
   EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOi...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   EXPO_PUBLIC_OPEN_FINANCE_SANDBOX=true