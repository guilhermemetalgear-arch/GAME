import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // somente no backend!
  { auth: { persistSession: false } }
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    const { name, points } = JSON.parse(event.body || '{}');

    if (!name || typeof points !== 'number') {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Parâmetros inválidos: name e points são obrigatórios.' })
      };
    }

    // insere score
    const { data, error } = await supabase
      .from('scores')
      .insert([{ name, points }])
      .select()
      .single();

    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, score: data }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(err) }) };
  }
}
