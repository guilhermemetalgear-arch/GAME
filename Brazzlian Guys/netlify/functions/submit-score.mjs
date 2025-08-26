// netlify/functions/submit-score.mjs
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', ...cors },
  body: JSON.stringify(body),
});

function normalizeNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(',', '.'));
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function parseBody(event) {
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (event.httpMethod === 'GET') return event.queryStringParameters || {};

  if (ct.includes('application/json')) {
    try { return JSON.parse(event.body || '{}'); } catch { return {}; }
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body || '');
    return Object.fromEntries(params.entries());
  }
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['POST','GET'].includes(event.httpMethod)) return json(405, { error: 'Method Not Allowed' });

  // Env check
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const input = parseBody(event);

  // ✅ Aliases aceitos agora:
  // name, nome, player, jogador, userName, username, user_name
  // points, score, pontuacao, pontos
  const rawName =
    input.name ?? input.nome ?? input.player ?? input.jogador ??
    input.userName ?? input.username ?? input.user_name;

  const rawPoints = input.points ?? input.score ?? input.pontuacao ?? input.pontos;

  const name = typeof rawName === 'string' ? rawName.trim() : undefined;
  const points = normalizeNumber(rawPoints);

  if (!name || typeof points !== 'number') {
    console.warn('[submit-score] params invalid', {
      name,
      pointsRawType: typeof rawPoints,
      pointsParsedType: typeof points,
      method: event.httpMethod,
      contentType: event.headers?.['content-type'] || event.headers?.['Content-Type'],
      bodyPreview: (event.body || '').slice(0, 200),
      query: event.queryStringParameters || {}
    });
    return json(400, {
      error: 'Parâmetros inválidos. Envie { userName/name: string, points: number }.',
      received: { name, points }
    });
  }

  // (Opcional) capture userId se vier
  const user_id = input.userId ?? input.userid ?? input.user_id ?? null;

  console.log('[submit-score] inserting', { name, points, user_id });

  const { data, error } = await supabase
    .from('scores')                       // confirme o nome e colunas
    .insert([{ name, points, user_id }])  // tenha a coluna user_id (nullable) se quiser salvar
    .select('*')
    .single();

  if (error) {
    console.error('[submit-score] insert error', error);
    return json(500, { error: error.message });
  }

  console.log('[submit-score] inserted row', data);
  return json(200, { ok: true, score: data });
}
