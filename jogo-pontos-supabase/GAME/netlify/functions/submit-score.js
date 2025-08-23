// /.netlify/functions/submit-score
// Salva pontuação no Supabase via REST (sem dependências externas)
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { provisionalScore, userId, userName } = JSON.parse(event.body || '{}');

    // Validações básicas
    if (typeof provisionalScore !== 'number' || provisionalScore < 0 || provisionalScore > 100000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Score inválido' }) };
    }
    if (!userId || typeof userId !== 'string' || userId.length > 80) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId inválido' }) };
    }
    const cleanName = (userName || 'jogador').toString().slice(0, 80);

    // Recalcular/aplicar regra secreta (exemplo simples)
    const finalScore = Math.round(provisionalScore * 0.97 + 3);

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    const table = process.env.SUPABASE_TABLE || 'scores';
    if (!url || !key) {
      return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE não configurados' }) };
    }

    const insertPayload = [{ user_id: userId, user_name: cleanName, points: finalScore }];

    const resp = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(insertPayload)
    });

    if (!resp.ok) {
      const msg = await resp.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao salvar', details: msg }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, finalScore })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro no servidor' }) };
  }
};
