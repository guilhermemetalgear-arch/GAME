const { createClient } = require('@supabase/supabase-js');

// Conecta-se ao Supabase usando as variáveis de ambiente corretas
const supabaseUrl = process.env.SUPABASE_URL;
// ATUALIZAÇÃO: Variável de ambiente corrigida conforme sua especificação
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Função principal que será executada pela Netlify
 */
exports.handler = async (event) => {
  // Garante que a requisição seja do tipo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Método não permitido.' }),
    };
  }

  try {
    const { login } = JSON.parse(event.body);

    if (!login) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'O login do usuário é obrigatório.' }),
      };
    }

    // 1. Busca os dados atuais do usuário na tabela 'usuarios'
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('videos_assistidos, tentativas')
      .eq('login', login)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' }),
      };
    }

    // 2. Calcula os novos valores
    const newWatchCount = (userData.videos_assistidos || 0) + 1;
    let attemptGranted = false;
    let finalWatchCount = newWatchCount;
    let newAttemptCount = userData.tentativas;

    // 3. Verifica se o usuário atingiu a meta de 5 vídeos
    if (newWatchCount >= 5) {
      attemptGranted = true;
      finalWatchCount = 0; // Zera o contador de vídeos assistidos
      newAttemptCount = (userData.tentativas || 0) + 1; // Adiciona 1 tentativa

      const currentMonth = new Date().getMonth() + 1;

      // Chama a função RPC no Supabase para incrementar a contagem do mês
      const { error: rpcError } = await supabase.rpc('incrementar_tentativas_mensais', {
        mes_id: currentMonth,
        incremento: 1,
      });

      if (rpcError) {
        console.error('Erro ao chamar RPC para incrementar tentativas mensais:', rpcError);
        throw new Error('Não foi possível atualizar a contagem de tentativas geradas.');
      }
    }

    // 4. Atualiza os dados do usuário na tabela 'usuarios'
    const { error: updateUserError } = await supabase
      .from('usuarios')
      .update({
        videos_assistidos: finalWatchCount,
        tentativas: newAttemptCount,
      })
      .eq('login', login);

    if (updateUserError) {
      console.error('Erro ao atualizar dados do usuário:', updateUserError);
      throw new Error('Não foi possível salvar o progresso do usuário.');
    }

    // 5. Retorna uma resposta de sucesso para o frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: attemptGranted ? 'Tentativa concedida com sucesso!' : 'Contagem de vídeo incrementada.',
        attemptGranted: attemptGranted,
        newWatchCount: finalWatchCount,
      }),
    };
  } catch (error) {
    console.error('Erro inesperado na função:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message || 'Ocorreu um erro interno.' }),
    };
  }
};