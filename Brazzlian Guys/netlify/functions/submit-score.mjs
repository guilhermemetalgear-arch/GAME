// netlify/functions/submit-score.mjs
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function res(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  };
}

function normalizeNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const trimmed = v.trim().replace(',', '.'); // "123,4" -> "123.4"
    const n = Number(trimmed);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function parseBody(event) {
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();

  // 1) JSON
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(event.body || '{}');
    } catch (e) {
      console.error('[submit-score] JSON parse error:', e);
      return {};
    }
  }

  // 2) x-www-form-urlencoded
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body || '');
    return Object.fromEntries(params.entries());
  }

  // 3) Fallback: tentar JSON, se falhar, vazio
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }

  // Permito GET para teste rápido via query string
  if (!['POST', 'GET'].includes(event.httpMethod)) {
    return res(405, { error: 'Method Not Allowed' });
  }

  // Conferir envs (sem expor chaves)
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[submit-score] env', {
    SUPABASE_URL: hasUrl ? 'ok' : 'missing',
    SUPABASE_SERVICE_ROLE_KEY: hasKey ? 'ok' : 'missing',
  });
  if (!hasUrl || !hasKey) {
    return res(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // --- Captura parâmetros de várias formas ---
  let input = {};
  if (event.httpMethod === 'GET') {
    input = event.queryStringParameters || {};
  } else {
    input = parseBody(event);
  }

  // Suporte a aliases comuns (name/nome, points/pontos/score)
  const rawName = input.name ?? input.nome ?? input.player ?? input.jogador;
  const rawPoints = input.points ?? input.pontos ?? input.score ?? input.pontuacao;

  const name = typeof rawName === 'string' ? rawName.trim() : undefined;
  const points = normalizeNumber(rawPoints);

  if (!name || typeof points !== 'number') {
    console.warn('[submit-score] params invalid', {
      name,
      pointsRawType: typeof rawPoints,
      pointsParsedType: typeof points,
      method: event.httpMethod,
      contentType: event.headers?.['content-type'] || event.headers?.['Content-Type'],
      bodyPreview: (event.body || '').slice(0, 120),
      query: event.queryStringParameters,
    });

    return res(400, {
      error: 'Parâmetros inválidos. Envie { name: string, points: number }.',
      received: { name, points },
      hint: {
        json: `fetch('/.netlify/functions/submit-score', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'Jogador', points:123})})`,
        form: `curl -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "name=Jogador&points=123" "https://SEU-SITE.netlify.app/.netlify/functions/submit-score"`,
        get: `GET /.netlify/functions/submit-score?name=Jogador&points=123 (apenas para teste)`,
      },
    });
  }

  // Inserir
  console.log('[submit-score] inserting', { name, points });
  const { data, error } = await supabase
    .from('scores') // confirme o nome/schema da sua tabela
    .insert([{ name, points }])
    .select('*')
    .single();

  if (error) {
    console.error('[submit-score] insert error', error);
    return res(500, { error: error.message });
  }

  console.log('[submit-score] inserted row', data);
  return res(200, { ok: true, score: data });
}
