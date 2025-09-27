const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  // Cabeçalhos de CORS para permitir requisições do seu app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Ou substitua '*' pelo domínio do seu app para mais segurança
    'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Responde imediatamente a requisições OPTIONS (pre-flight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS pre-flight successful' }),
    };
  }

  // Função helper para criar respostas com os headers de CORS
  const createResponse = (statusCode, body) => {
    return {
      statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };
  };
  
  // Log para sabermos que a função foi acionada
  console.log("--- Função 'increment-video-watch' iniciada! ---");

  if (event.httpMethod !== 'POST') {
    console.error("Erro: Método não permitido. Requer POST.");
    return createResponse(405, { success: false, message: 'Método não permitido.' });
  }

  try {
    const { login } = JSON.parse(event.body);
    console.log(`Login recebido do app: "${login}"`);

    if (!login) {
      console.error("Erro: Login não foi fornecido no corpo da requisição.");
      return createResponse(400, { success: false, message: 'O login do usuário é obrigatório.' });
    }

    console.log(`Buscando usuário "${login}" no Supabase...`);
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('videos_assistidos, tentativas')
      .eq('login', login)
      .single();

    if (userError || !userData) {
      console.error(`ERRO ao buscar usuário "${login}":`, userError);
      return createResponse(404, { success: false, message: 'Usuário não encontrado.' });
    }

    console.log("Usuário encontrado. Dados atuais:", userData);
    
    const newWatchCount = (userData.videos_assistidos || 0) + 1;
    console.log(`Cálculo: Contagem de vídeos será atualizada para: ${newWatchCount}`);

    let attemptGranted = false;
    let finalWatchCount = newWatchCount;
    let newAttemptCount = userData.tentativas;

    if (newWatchCount >= 5) {
      console.log("CONDIÇÃO ATINGIDA! O usuário assistiu 5 vídeos. Concedendo tentativa...");
      attemptGranted = true;
      finalWatchCount = 0;
      newAttemptCount = (userData.tentativas || 0) + 1;

      const now = new Date();
      const currentMonth = now.getMonth() + 1; // getMonth() é 0-11, então +1
      const currentYear = now.getFullYear();

      console.log(`Chamando a função RPC 'incrementar_tentativas_mensais' para o mês ${currentMonth} e ano ${currentYear}...`);
      
      // ---- ALTERAÇÃO DOS PARÂMETROS PARA CORRESPONDER AO BANCO DE DADOS ----
      const { error: rpcError } = await supabase.rpc('incrementar_tentativas_mensais', {
        mes_param: currentMonth,
        ano_param: currentYear,
        incremento_param: 1,
      });
      // ---- FIM DA ALTERAÇÃO ----

      if (rpcError) {
        console.error("ERRO ao chamar a função RPC:", rpcError);
        throw new Error('Não foi possível atualizar a contagem de tentativas geradas.');
      }
      console.log("Função RPC executada com sucesso!");
    } else {
      console.log("Condição de 5 vídeos não atingida. Apenas atualizando o usuário.");
    }

    console.log(`Atualizando usuário "${login}" com { videos_assistidos: ${finalWatchCount}, tentativas: ${newAttemptCount} }`);
    const { error: updateUserError } = await supabase
      .from('usuarios')
      .update({
        videos_assistidos: finalWatchCount,
        tentativas: newAttemptCount,
      })
      .eq('login', login);

    if (updateUserError) {
      console.error("ERRO ao atualizar dados do usuário:", updateUserError);
      throw new Error('Não foi possível salvar o progresso do usuário.');
    }

    console.log("--- Função 'increment-video-watch' concluída com sucesso! ---");
    return createResponse(200, {
        success: true,
        message: attemptGranted ? 'Tentativa concedida com sucesso!' : 'Contagem de vídeo incrementada.',
        attemptGranted: attemptGranted,
        newWatchCount: finalWatchCount,
    });

  } catch (error) {
    console.error("--- ERRO FATAL NA FUNÇÃO ---:", error);
    return createResponse(500, { success: false, message: error.message || 'Ocorreu um erro interno.' });
  }
};