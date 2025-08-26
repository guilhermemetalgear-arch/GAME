// netlify/functions/submit-score.mjs (ESM)
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
  if (ct.includes('application/json')) { try { return JSON.parse(event.body || '{}'); } catch { return {}; } }
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body || '');
    return Object.fromEntries(params.entries());
  }
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['POST','GET'].includes(event.httpMethod)) return json(405, { error: 'Method Not Allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const input = parseBody(event);

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
    return json(400, { error: 'Parâmetros inválidos. Envie { userName/name: string, points: number }.' });
  }

  // monta o objeto mínimo (sem user_id)
  const row = { name, points };

  console.log('[submit-score] inserting', row);

  const { data, error } = await supabase
    .from('scores')     // confira nome/schema
    .insert([row])
    .select('*')
    .single();

  if (error) {
    console.error('[submit-score] insert error', error);
    return json(500, { error: error.message });
  }

  console.log('[submit-score] inserted row', data);
  return json(200, { ok: true, score: data });
}
