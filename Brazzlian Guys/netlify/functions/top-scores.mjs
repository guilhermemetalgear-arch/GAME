// netlify/functions/top-scores.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    : null;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    if (!supabase) {
      return json(500, { error: 'Supabase não configurado. Defina SUPABASE_URL e uma KEY.' });
    }

    // ?limit=3 (padrão 3, máx 50)
    const url = new URL(event.rawUrl || `http://x${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
    const limitParam = parseInt(url.searchParams.get('limit') || '3', 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 3;

    // Busca diretamente as top pontuações: name + points
    const { data, error } = await supabase
      .from('scores')
      .select('name, points')
      .order('points', { ascending: false })
      .limit(limit);

    if (error) {
      return json(500, { error: error.message || 'Erro ao consultar a tabela scores' });
    }

    // Normaliza o payload esperado pela janela de ranking
    const out = (data || []).map((r) => ({
      user_name: r.name ?? 'Anônimo',
      points: typeof r.points === 'number' ? r.points : 0,
    }));

    return json(200, { data: out });
  } catch (e) {
    return json(500, { error: e?.message || 'Erro inesperado' });
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  };
}
