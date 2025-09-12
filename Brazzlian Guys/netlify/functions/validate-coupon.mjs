// Arquivo: netlify/functions/validate-coupon.mjs
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', ...cors },
  body: JSON.stringify(body),
});

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente Supabase não configurado.' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { cupom } = parseBody(event);
  if (!cupom) {
    return json(400, { success: false, message: 'Código do cupom não fornecido.' });
  }

  try {
    // Verifica se o cupom existe na tabela de cupons disponíveis
    const { data: cupomDisponivel, error: findError } = await supabase
      .from('Cupons_Disponiveis')
      .select('Cupons')
      .eq('Cupons', cupom)
      .single();

    // Se houve um erro na busca ou o cupom não foi encontrado, retorna falha.
    if (findError || !cupomDisponivel) {
      return json(404, { success: false, message: 'Cupom inválido ou não encontrado.' });
    }
    
    // Se o cupom foi encontrado, retorna sucesso.
    return json(200, { success: true, message: 'Cupom válido!' });

  } catch (error) {
    console.error('[validate-coupon] Server error:', error);
    return json(500, { success: false, message: 'Erro interno ao validar o cupom.' });
  }
}