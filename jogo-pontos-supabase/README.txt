# Jogo de Pontos (Netlify + Supabase)
- Ao entrar, o site solicita o **nome** do jogador.
- Cada clique em **"Clique em mim"** soma **+1 ponto**.
- **Enviar pontuação** salva no backend (Netlify Function) e registra no **Supabase**.
- O cabeçalho mostra o **recorde (maior pontuação)** e o nome do jogador que detém o recorde, via endpoint `/.netlify/functions/max-score`.

## Publicar (Netlify)
1. Em **Deploy manually → browse to upload**, envie esta pasta ou o .zip.
2. Em **Site settings → Environment variables**, configure:
   - `SUPABASE_URL` → URL do seu projeto (ex.: `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE` → chave de service role do Supabase (**use apenas no backend**)
   - (Opcional) `SUPABASE_TABLE` → nome da tabela (padrão: `scores`)

## Supabase – Tabela
Crie a tabela `scores` com este SQL:
```sql
create extension if not exists pgcrypto;

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  points int not null check (points >= 0),
  created_at timestamptz not null default now()
);

create index if not exists scores_points_idx on scores (points desc, created_at asc);
```

> Dica: você pode habilitar RLS e criar policies. Como estamos usando a `SERVICE_ROLE` somente no backend (funções Netlify), as chamadas do cliente **não** expõem credenciais.

## Endpoints
- `POST /.netlify/functions/submit-score` → salva pontuação (recalcula server-side)
- `GET  /.netlify/functions/max-score`    → retorna maior pontuação e nome

## Front-end
- Solicita nome ao entrar (usa `window.prompt`) e persiste em `localStorage`.
- Mostra o recorde consultando `max-score`.
- Envia `{ provisionalScore, userId, userName }` para `submit-score`.

Boa publicação! 🚀
