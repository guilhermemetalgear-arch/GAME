// /.netlify/functions/max-score
// Retorna a maior pontuação salva (com nome) via Supabase REST
exports.handler = async () => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    const table = process.env.SUPABASE_TABLE || 'scores';
    if (!url || !key) {
      return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE não configurados' }) };
    }

    const endpoint = `${url}/rest/v1/${table}?select=user_id,user_name,points,created_at&order=points.desc&order=created_at.asc&limit=1`;
    const resp = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      }
    });

    if (!resp.ok) {
      const msg = await resp.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao consultar', details: msg }) };
    }

    const rows = await resp.json();
    const max = rows && rows.length ? rows[0] : null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro no servidor' }) };
  }
};
