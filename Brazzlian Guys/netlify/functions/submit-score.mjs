import { createClient } from '@supabase/supabase-js';

// CORS básico
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // LOG: conferir envs (sem expor a chave)
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[submit-score] env', { SUPABASE_URL: hasUrl ? 'ok' : 'missing', SUPABASE_SERVICE_ROLE_KEY: hasKey ? 'ok' : 'missing' });

  if (!hasUrl || !hasKey) {
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Validar body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    console.error('[submit-score] JSON parse error', e);
    return json(400, { error: 'Body inválido (JSON malformado)' });
  }

  let { name, points } = payload;

  // Converter points string -> number, se necessário
  if (typeof points === 'string' && points.trim() !== '') {
    const n = Number(points);
    if (!Number.isNaN(n)) points = n;
  }

  if (!name || typeof points !== 'number') {
    console.warn('[submit-score] params invalid', { name, pointsType: typeof points });
    return json(400, { error: 'Parâmetros inválidos: envie { name: string, points: number }' });
  }

  // LOG: antes do insert
  console.log('[submit-score] inserting', { name, points });

  const { data, error } = await supabase
    .from('scores')           // <-- confira o nome da tabela
    .insert([{ name, points }])
    .select('*')
    .single();

  if (error) {
    console.error('[submit-score] insert error', error);
    return json(500, { error: error.message });
  }

  // LOG: sucesso
  console.log('[submit-score] inserted row', data);

  return json(200, { ok: true, score: data });
}
