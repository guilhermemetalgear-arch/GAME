// netlify/functions/submit-gamedata.mjs (ESM)
import { createClient } from '@supabase/supabase-js';

// Re-using CORS and JSON helper from other functions
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

// A simple body parser, assuming JSON for this function
function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

// =========================================================================
//  INÍCIO DA LÓGICA DE SIMULAÇÃO DO JOGO (PORTADO DO CLIENT-SIDE)
// =========================================================================

// É crucial que esta configuração seja uma cópia exata da que está no script.js
const GAME_CONFIG = {
    characters: {
      character1: { name: "Maria", health: 120, size: { width: 98, height: 98 } },
      character2: { name: "Motoboy", health: 100, size: { width: 90, height: 90 } },
      character3: { name: "João", health: 100, size: { width: 105, height: 105 } }
    },
    enemies: [
      { health: 100, size: { width: 70, height: 70 } }, { health: 100, size: { width: 80, height: 80 } },
      { health: 110, size: { width: 75, height: 75 } }, { health: 80,  size: { width: 60, height: 60 } },
      { health: 90,  size: { width: 65, height: 65 } }, { health: 150, size: { width: 90, height: 90 } },
      { health: 100, size: { width: 70, height: 70 } }, { health: 110, size: { width: 75, height: 75 } },
      { health: 120, size: { width: 80, height: 80 } }, { health: 120, size: { width: 80, height: 80 } }
    ]
};

const spawnTableCSV = `spawn_point,spawn_axis_percent,exit_point,exit_axis_percent,enemy_type_index,spawn_time_seconds
topo,50,base,50,0,1
esquerda,20,direita,80,1,2.5
direita,80,esquerda,20,2,3.5
topo,10,base,90,3,5
topo,90,base,10,4,5.5
base,50,topo,50,5,7
esquerda,50,direita,50,6,8.5
direita,50,esquerda,50,7,9.5
base,25,topo,75,8,11
base,75,topo,25,9,11.5
topo,50,base,50,0,13
esquerda,30,direita,70,1,14
direita,70,esquerda,30,2,14
topo,20,base,80,3,15.5
topo,80,base,20,4,15.5
base,50,topo,50,5,17
esquerda,50,direita,50,6,18
direita,50,esquerda,50,7,18
base,10,topo,90,8,19.5
base,90,topo,10,9,19.5`;

const movementPatterns = [
    { dx: 1.0, dy: 1.0 }, { dx: -1.0, dy: 1.0 }, { dx: 1.0, dy: -1.0 },
    { dx: 0, dy: 1.2 }, { dx: 1.2, dy: 0 }, { dx: -1.2, dy: 0 },
    { dx: 0, dy: -1.2 }, { dx: 0.8, dy: 1.5 }, { dx: -0.8, dy: 1.5 },
    { dx: 1.5, dy: 0.8 }
];

// Dimensões do canvas do jogo, necessárias para a simulação
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

function parseSpawnData() {
    const lines = spawnTableCSV.trim().split('\n').slice(1);
    const sideMap = { 'topo': 0, 'direita': 1, 'base': 2, 'esquerda': 3 };
    return lines.map(line => {
        const [spawnPoint, axisPercent, , , typeIndexStr, spawnTime] = line.split(',');
        return {
            side: sideMap[spawnPoint.trim()],
            percent: parseFloat(axisPercent),
            typeIndex: parseInt(typeIndexStr, 10),
            spawnTime: parseFloat(spawnTime) * 1000 // Convert to ms
        };
    });
}
const SPAWN_WAVES = parseSpawnData();

/**
 * A função principal que simula a partida e valida o score.
 * @param {object} clientData - O objeto contendo { score, characterInfo, virtueInfo, gameplayLog }
 * @returns {boolean} - Retorna true se o score for válido, false caso contrário.
 */
function validateScore(clientData) {
    const { score: clientScore, characterInfo, virtueInfo, gameplayLog } = clientData;
    if (!gameplayLog || gameplayLog.length === 0) return false;

    // 1. Inicializar estado do jogo com base nos dados do cliente
    const charConfig = GAME_CONFIG.characters[characterInfo.id];
    let player = {
        x: CANVAS_WIDTH / 2 - charConfig.size.width / 2,
        y: CANVAS_HEIGHT / 2 - charConfig.size.height / 2,
        width: charConfig.size.width,
        height: charConfig.size.height,
        speed: 300,
        health: charConfig.health,
        damageBonus: 0,
        damageReduction: 0,
        lastHitTime: 0,
    };
    
    // Aplicar bônus do personagem
    let extraLife = false;
    if (characterInfo.id === 'character1') extraLife = true;
    if (characterInfo.id === 'character2') player.speed *= 1.40;
    
    // Aplicar bônus da virtude
    const virtueStats = virtueInfo.stats;
    player.speed *= (1 + parseFloat(virtueStats.speed));
    player.damageBonus += parseFloat(virtueStats.damage);
    player.damageReduction += parseFloat(virtueStats.reduction);

    // Variáveis da simulação
    let serverEnemiesDefeated = 0;
    let gameTime = 0;
    let enemies = [];
    let projectiles = [];
    let spawnIndex = 0;
    const TICK_INTERVAL = 50; // ms, igual ao log do cliente

    // 2. Loop principal da simulação
    for (const logEntry of gameplayLog) {
        const deltaTime = logEntry.time - gameTime;
        gameTime = logEntry.time;

        if (gameTime / 1000 >= 60) break; // Fim de jogo por tempo

        // Simular movimento do jogador
        const moveVector = logEntry.move;
        const dx = moveVector.x;
        const dy = moveVector.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
            player.x += (dx / len) * player.speed * (deltaTime / 1000);
            player.y += (dy / len) * player.speed * (deltaTime / 1000);
        }
        player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
        player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));
        
        // Simular disparos
        const fireVector = logEntry.fire;
        if (fireVector && (fireVector.x !== 0 || fireVector.y !== 0)) {
            const fireLen = Math.hypot(fireVector.x, fireVector.y) || 1;
            const size = (characterInfo.id === 'character1') ? 30 * 3 : 30;
            projectiles.push({
                x: player.x + player.width / 2 - size / 2,
                y: player.y + player.height / 2 - size / 2,
                width: size, height: size,
                vx: (fireVector.x / fireLen) * 800,
                vy: (fireVector.y / fireLen) * 800,
            });
        }
        
        // Simular spawns de inimigos baseado no TEMPO
        while(spawnIndex < SPAWN_WAVES.length && gameTime >= SPAWN_WAVES[spawnIndex].spawnTime) {
            const wave = SPAWN_WAVES[spawnIndex];
            const enemyConfig = GAME_CONFIG.enemies[wave.typeIndex];
            let enemy = { x: 0, y: 0, width: enemyConfig.size.width, height: enemyConfig.size.height, health: enemyConfig.health };
            
            const startX = (wave.side === 0 || wave.side === 2) ? (CANVAS_WIDTH * wave.percent / 100) : 0;
            const startY = (wave.side === 1 || wave.side === 3) ? (CANVAS_HEIGHT * wave.percent / 100) : 0;
            
            switch(wave.side) {
                case 0: enemy.x = startX; enemy.y = -enemy.height; break;
                case 1: enemy.x = CANVAS_WIDTH; enemy.y = startY; break;
                case 2: enemy.x = startX; enemy.y = CANVAS_HEIGHT; break;
                case 3: enemy.x = -enemy.width; enemy.y = startY; break;
            }
            
            const angle = Math.atan2(CANVAS_HEIGHT/2 - enemy.y, CANVAS_WIDTH/2 - enemy.x);
            const speed = (Math.hypot(movementPatterns[wave.typeIndex].dx, movementPatterns[wave.typeIndex].dy) || 2) * 60;
            enemy.dx = Math.cos(angle) * speed;
            enemy.dy = Math.sin(angle) * speed;
            enemies.push(enemy);
            spawnIndex++;
        }

        // Mover inimigos e projéteis
        enemies.forEach(e => { e.x += e.dx * (deltaTime/1000); e.y += e.dy * (deltaTime/1000); });
        projectiles.forEach(p => { p.x += p.vx * (deltaTime/1000); p.y += p.vy * (deltaTime/1000); });

        // Detecção de Colisão
        // Jogador vs Inimigo
        if (Date.now() - player.lastHitTime >= 500) {
            for (const enemy of enemies) {
                if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x &&
                    player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
                    player.lastHitTime = Date.now();
                    if (characterInfo.id === 'character1' && extraLife) {
                        extraLife = false;
                        if(enemy.health > 0) { enemy.health = 0; serverEnemiesDefeated++; }
                    } else {
                        const damageToPlayer = 35 * (1 - player.damageReduction);
                        const damageToEnemy = 34 * (1 + player.damageBonus);
                        if (enemy.health > 0) {
                            enemy.health -= damageToEnemy;
                            if (enemy.health <= 0) serverEnemiesDefeated++;
                        }
                        player.health -= damageToPlayer;
                    }
                }
            }
        }
        
        // Projétil vs Inimigo
        for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
            const p = projectiles[pIdx];
            let hit = false;
            for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = enemies[eIdx];
                if (enemy.health > 0 && p.x < enemy.x + enemy.width && p.x + p.width > enemy.x && 
                    p.y < enemy.y + enemy.height && p.y + p.height > enemy.y) {
                    enemy.health -= 100;
                    if (enemy.health <= 0) serverEnemiesDefeated++;
                    hit = true;
                    break;
                }
            }
            if (hit) projectiles.splice(pIdx, 1);
        }

        // Limpar inimigos e projéteis
        enemies = enemies.filter(e => e.health > 0 && e.x > -e.width && e.x < CANVAS_WIDTH + e.width && e.y > -e.height && e.y < CANVAS_HEIGHT + e.height);
        projectiles = projectiles.filter(p => p.x > -p.width && p.x < CANVAS_WIDTH && p.y > -p.height && p.y < CANVAS_HEIGHT);

        if (player.health <= 0) break;
    }

    // 3. Calcular score final da simulação
    const simulatedGameDuration = Math.min(60, gameTime / 1000);
    const simulatedScore = Math.round(serverEnemiesDefeated * simulatedGameDuration);

    // 4. Comparar com o score do cliente (com uma tolerância de 2%)
    const tolerance = 0.02;
    const scoreDifference = Math.abs(clientScore - simulatedScore);
    const isValid = scoreDifference <= (simulatedScore * tolerance) || scoreDifference <= 5; // Tolerância mínima para scores baixos

    console.log(`[Validation] Client Score: ${clientScore}, Simulated Score: ${simulatedScore}, Defeated: ${serverEnemiesDefeated}, Duration: ${simulatedGameDuration.toFixed(2)}s. Valid: ${isValid}`);
    
    return isValid;
}

// =========================================================================
//  FIM DA LÓGICA DE SIMULAÇÃO DO JOGO
// =========================================================================


export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const input = parseBody(event);

  const { userName, score, characterInfo, virtueInfo, gameplayLog } = input;

  if (!userName || typeof score !== 'number' || !characterInfo || !virtueInfo || !Array.isArray(gameplayLog)) {
    return json(400, { error: 'Parâmetros inválidos.' });
  }

  // ETAPA DE VERIFICAÇÃO ANTI-HACK DE TEMPO DE PARTIDA
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('ultima_tentativa')
    .eq('login', userName)
    .single();

  if (userError || !userData) {
    console.warn('[submit-gamedata] Usuário não encontrado para validação:', userName);
    return json(403, { error: 'Falha na validação: usuário não encontrado.' });
  }

  const lastAttemptTime = new Date(userData.ultima_tentativa).getTime();
  const now = new Date().getTime();
  const diffSeconds = (now - lastAttemptTime) / 1000;
  const MAX_SECONDS_ALLOWED = 90;

  if (diffSeconds > MAX_SECONDS_ALLOWED) {
    console.warn(`[submit-gamedata] Falha na validação anti-hack para o usuário ${userName}. Diferença de tempo: ${diffSeconds}s`);
    return json(403, { error: `Verificação de tempo da partida falhou. (>${MAX_SECONDS_ALLOWED}s)` });
  }

  // NOVA ETAPA: VALIDAÇÃO DA PARTIDA POR SIMULAÇÃO
  const isScoreLegit = validateScore(input);
  if (!isScoreLegit) {
    console.warn(`[submit-gamedata] Falha na validação de score para ${userName}. Score suspeito.`);
    // Retornamos um erro 403 (Proibido) para indicar que a submissão foi rejeitada.
    return json(403, { error: 'A pontuação enviada falhou na validação do servidor.' });
  }
  // FIM DA NOVA ETAPA

  // Se a pontuação for válida, continua para inserir no banco de dados
  const row = {
    user_name: userName,
    score: score,
    character_info: characterInfo,
    virtue_info: virtueInfo,
    gameplay_log: gameplayLog
  };

  console.log('[submit-gamedata] inserting gamedata for user:', userName);

  const { data, error } = await supabase
    .from('armazenamento_de_jogo')
    .insert([row])
    .select('*')
    .single();

  if (error) {
    console.error('[submit-gamedata] insert error', error);
    return json(500, { error: error.message });
  }

  console.log('[submit-gamedata] inserted row', data);
  return json(200, { ok: true, data });
}