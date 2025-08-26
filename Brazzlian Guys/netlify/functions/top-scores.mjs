import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || '10', 10), 100);

  const { data, error } = await supabase
    .from('scores')
    .select('id, name, points, created_at')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify({ scores: data }) };
}
