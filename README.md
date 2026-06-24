# Arquidesk

SaaS web app para arquitetura, interiores, moveis planejados e marcenaria.

## Rodar localmente

1. Crie um projeto no Supabase.
2. Rode estes SQLs no SQL Editor, nesta ordem:

```text
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/004_storage.sql
supabase/migrations/005_onboarding.sql
```

3. Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

4. Instale e rode:

```bash
npm install
npm run dev
```

## Primeiro acesso

Use a aba **Cadastrar** na tela inicial. O cadastro cria o usuario no Supabase Auth, a empresa, o perfil `ADMIN_EMPRESA` e uma assinatura trial.

Nao ha dados mockados no projeto.
