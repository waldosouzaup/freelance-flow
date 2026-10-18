# Supabase Daily Keep-Alive via Netlify Scheduled Function

## Goal
Implementar uma Netlify Scheduled Function diária que envia um ping leve via API REST para o Supabase, garantindo que o banco de dados não seja pausado por inatividade no tier gratuito.

## Architecture
- **Runtime**: Netlify Functions (Node.js) com `@netlify/functions`
- **Schedule**: `@daily` (execução 1x ao dia)
- **Operação**: Requisição leve à API REST do Supabase (`/rest/v1/profiles?select=id&limit=1`) com as credenciais da anon key
- **Configuração**: Atualização de `netlify.toml` para definir o diretório de functions

## Tasks
- [x] Task 1: Instalar `@netlify/functions` como dependência de desenvolvimento no `package.json` → Verify: `npm list @netlify/functions`
- [x] Task 2: Configurar `[functions]` em `netlify.toml` apontando para `netlify/functions` → Verify: verificar sintaxe do `netlify.toml`
- [x] Task 3: Criar a função agendada `netlify/functions/supabase-keep-alive.ts` usando `schedule('@daily', ...)` → Verify: arquivo criado com tratamento de erro e fallbacks de env
- [x] Task 4: Criar script de teste / trigger local `npm run test:keepalive` para validar comunicação com o Supabase → Verify: status HTTP 200 retornado pelo Supabase (317ms)
- [x] Task 5: Validar build de produção (`npm run build`) para garantir compatibilidade → Verify: build passa com código 0

## Done When
- [x] Netlify function configurada e agendada para `@daily`
- [x] Comunicação com a API REST do Supabase testada e retornando sucesso (200 OK)
- [x] `npm run build` executa perfeitamente sem quebrar a aplicação frontend
