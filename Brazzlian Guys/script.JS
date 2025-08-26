document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bg-music');

  // Telas
  const characterSelectScreen = document.getElementById('character-select-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const gameContainer = document.getElementById('game-container');
  const controls = document.getElementById('controls');

  // Ranking interno
  const leaderboardButton = document.getElementById('leaderboardButton');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardReload = document.getElementById('leaderboardReload');
  const leaderboardBack = document.getElementById('leaderboardBack');

  // === Patrocinadores (apenas URLs definidas no código) ===
  // 1º já com a URL solicitada
  const SPONSOR_URLS = [
    'https://i.postimg.cc/NMqJb8Mm/ali.jpg', // Patrocinador 1
    '',                                        // Patrocinador 2 (defina aqui)
    ''                                         // Patrocinador 3 (defina aqui)
  ];
  const sponsorImgs = [
    document.getElementById('sponsor1Img'),
    document.getElementById('sponsor2Img'),
    document.getElementById('sponsor3Img'),
  ];
  function initSponsors() {
    sponsorImgs.forEach((img, idx) => {
      const url = SPONSOR_URLS[idx];
      const item = img.closest('.sponsor-item');
      if (url) {
        img.src = url;
        item.style.display = 'block'; // mostra só quando há URL
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Elementos do jogo
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const restartButton = document.getElementById('restartButton');

  // Controles mobile
  const upBtn = document.getElementById('up-btn');
  const downBtn = document.getElementById('down-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const aBtn = document.getElementById('a-btn');
  const controlRestartBtn = document.getElementById('control-restart-btn');

  // Personagens
  const characterOptions = document.querySelectorAll('.character-option');

  // Estado
  let selectedCharacterId = null;
  let extraLife = false;
  let abilityUsed = false;
  let enemyCount = 0;
  let userName = null; // pedido 1x no início
  let userId = null;

  // Canvas e assets
  function resizeCanvas() {
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = rect.width || 1000;
    canvas.height = gameContainer.getBoundingClientRect().height || 800;
  }
  canvas.width = 1000;
  canvas.height = 800;

  const backgroundImage = new Image();
  backgroundImage.src = 'https://i.postimg.cc/c19wL0CG/1-rocinha-favela-closeup.jpg';

  const playerImage = new Image();
  let currentPlayerImageSrc = '';

  // Partículas da habilidade (Malandro)
  const thunderImg = new Image();
  thunderImg.src = 'https://i.postimg.cc/jSqr4b9t/Pngtree-thunder-and-bolt-flash-vector-4723241.png';

  /** Partículas do efeito */
  let abilityParticles = [];
  /** Vetor de último movimento para saber o "atrás" do personagem */
  let lastMove = { x: 1, y: 0 };

  // Inimigos
  const enemyURLs = [
    'https://i.postimg.cc/hG3R7qvv/33.jpg',
    'https://i.postimg.cc/3rcYwcHc/blusinha.png',
    'https://i.postimg.cc/bv92cjWM/3.jpg',
    'https://i.postimg.cc/tgz7mQMg/Ovos-PNG-Transparente-Sem-Fundo.png',
    'https://i.postimg.cc/Y0h4WL0K/6.jpg',
    'URL_DA_IMAGEM_B6',
    'URL_DA_IMAGEM_B7',
    'URL_DA_IMAGEM_B8',
    'URL_DA_IMAGEM_B9',
    'URL_DA_IMAGEM_B10'
  ];
  const movementPatterns = [
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: 1.5, dy: 1.5 },
    { dx: 3, dy: 0 },
    { dx: 1, dy: -2 },
    { dx: -1.5, dy: 1.5 },
    { dx: 2.5, dy: -1 },
    { dx: -2, dy: -2 },
    { dx: 3, dy: 3 },
    { dx: -3, dy: 0 }
  ];
  const spawnWaves = [
    { typeIndex: 0, side: 0, startX: 0, startY: 300 },
    { typeIndex: 5, side: 1, startX: 1000, startY: 500 },
    { typeIndex: 7, side: 2, startX: 400, startY: 800 },
    { typeIndex: 8, side: 3, startX: 0, startY: 100 },
    { typeIndex: 9, side: 0, startX: 500, startY: 0 },
    { typeIndex: 1, side: 1, startX: 1000, startY: 200 },
    { typeIndex: 2, side: 2, startX: 250, startY: 800 },
    { typeIndex: 3, side: 3, startX: 0, startY: 600 },
    { typeIndex: 4, side: 0, startX: 750, startY: 0 },
    { typeIndex: 6, side: 1, startX: 1000, startY: 450 },
  ];

  // Player e jogo
  let player = { x: canvas.width/2 - 49, y: canvas.height/2 - 49, width: 98, height: 98, speed: 5 };
  let enemies = [];
  let gameOver = false;
  let time = 0;
  let enemyInterval;
  const keys = {};

  /* ========= Fluxo de telas ========= */
  function showSelect() {
    leaderboardScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    controls.style.display = 'none';
    characterSelectScreen.style.display = 'flex';
  }
  function showGame() {
    characterSelectScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    controls.style.display = 'flex';
  }
  function showLeaderboard() {
    characterSelectScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    controls.style.display = 'none';
    leaderboardScreen.style.display = 'block';
    loadTop3();
  }

  /* ========= Ranking ========= */
  async function loadTop3() {
    leaderboardList.innerHTML = '<div class="lb-item muted">Carregando...</div>';
    try {
      const res = await fetch('/.netlify/functions/top-scores?limit=3');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();
      const list = Array.isArray(payload?.data) ? payload.data : [];
      if (list.length === 0) {
        leaderboardList.innerHTML = '<div class="lb-item muted">Sem pontuações ainda.</div>';
        return;
      }
      leaderboardList.innerHTML = list.slice(0, 3).map((row, i) => {
        const name = row.user_name ?? row.name ?? 'Anônimo';
        const pts  = typeof row.points === 'number' ? row.points : (row.score ?? 0);
        return `
          <div class="lb-item">
            <div class="lb-pos">${i+1}º</div>
            <div class="lb-name">${name}</div>
            <div class="lb-score">${pts} pts</div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error(e);
      leaderboardList.innerHTML = '<div class="lb-item muted">Não foi possível carregar o ranking agora.</div>';
    }
  }
  leaderboardButton.addEventListener('click', showLeaderboard);
  leaderboardReload.addEventListener('click', loadTop3);
  leaderboardBack.addEventListener('click', showSelect);

  /* ========= Habilidade (Malandro) ========= */
  // 3× mais partículas
  const PARTICLE_MULTIPLIER = 3;

  function spawnAbilityBurst() {
    const baseCount = 36;
    const N = baseCount * PARTICLE_MULTIPLIER; // 108
    const baseSpeed = 4;
    const spread = 2;
    const maxLife = 35;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;

    // origem atrás do jogador (centro - direção de movimento * raio)
    let mvx = lastMove.x, mvy = lastMove.y;
    const mvLen = Math.hypot(mvx, mvy) || 1;
    mvx /= mvLen; mvy /= mvLen;
    const startX = cx - mvx * (player.width / 2 + 4);
    const startY = cy - mvy * (player.height / 2 + 4);

    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const spd = baseSpeed + (Math.random() * spread - spread/2);
      const vx = Math.cos(ang) * spd;
      const vy = Math.sin(ang) * spd;

      abilityParticles.push({
        x: startX,
        y: startY,
        vx,
        vy,
        life: maxLife,
        maxLife,
        size: 40,
      });
    }
  }

  function activateAbility() {
    if (selectedCharacterId === 'character3' && !abilityUsed) {
      // Efeito visual
      spawnAbilityBurst();

      // Efeito de jogo (remover inimigos no raio)
      const range = 200;
      enemies = enemies.filter(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        return Math.hypot(dx, dy) > range;
      });

      abilityUsed = true;
    }
  }

  /* ========= Movimento / Controles ========= */
  function resetMovementState() {
    ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].forEach(k => keys[k] = false);
  }
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' '].includes(e.key)) e.preventDefault();
    if (e.key.toLowerCase() === 'a') activateAbility();
    keys[e.key] = true;
    if (e.key === ' ') resetGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  /* ========= Persistência de pontuação ========= */
  async function saveScoreToSupabase(userId, userName, points) {
    try {
      const response = await fetch('/.netlify/functions/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, points }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.body || 'Failed to save score');
      }
      await response.json();
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  }

  /* ========= Game loop ========= */
  function createEnemy() {
    if (gameOver) return;
    const wave = spawnWaves[enemyCount % spawnWaves.length];
    const enemySize = 64;
    const img = new Image();
    img.src = enemyURLs[wave.typeIndex];
    enemies.push({
      x: wave.startX, y: wave.startY,
      width: enemySize, height: enemySize,
      dx: movementPatterns[wave.typeIndex].dx,
      dy: movementPatterns[wave.typeIndex].dy,
      image: img
    });
    enemyCount++;
  }

  function startGame() {
    if (bgMusic) { bgMusic.play().catch(() => {}); }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    enemyInterval = setInterval(createEnemy, 1000);
    gameLoop();
  }

  function update() {
    if (gameOver) return;

    // Movimento
    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['w']) dy -= 1;
    if (keys['ArrowDown'] || keys['s']) dy += 1;
    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      lastMove = { x: dx / len, y: dy / len };
    }

    player.y += (dy * player.speed);
    player.x += (dx * player.speed);

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

    // Inimigos
    enemies.forEach(e => { e.x += e.dx; e.y += e.dy; });

    // Colisão
    for (const enemy of enemies) {
      const collide = (
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
      );
      if (collide) {
        if (selectedCharacterId === 'character1' && extraLife) {
          extraLife = false; // Piriguete consome a vida extra
          enemies = enemies.filter(en => en !== enemy);
        } else {
          endGame();
        }
        break;
      }
    }

    // Limpa fora da tela
    enemies = enemies.filter(e =>
      e.x > -e.width && e.x < canvas.width + e.width &&
      e.y > -e.height && e.y < canvas.height + e.height
    );

    // Atualiza partículas
    abilityParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    abilityParticles = abilityParticles.filter(p => p.life > 0);

    time++;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo
    if (backgroundImage.complete && backgroundImage.naturalHeight !== 0) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#34495e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Partículas do poder (atrás do jogador) — desenhar antes do player
    abilityParticles.forEach(p => {
      const t = p.life / p.maxLife;            // 1..0
      const size = 10 + p.size * t;            // decresce
      const angle = Math.atan2(p.vy, p.vx);    // gira na direção
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      if (thunderImg.complete && thunderImg.naturalHeight !== 0) {
        ctx.globalAlpha = Math.max(0.2, t);
        ctx.drawImage(thunderImg, -size/2, -size/2, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI*2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
      }
      ctx.restore();
    });

    // Player
    if (playerImage.complete && playerImage.naturalHeight !== 0) {
      ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI*2);
      ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.closePath();
    }

    // Inimigos
    enemies.forEach(e => {
      if (e.image && e.image.complete && e.image.naturalHeight !== 0) {
        ctx.drawImage(e.image, e.x, e.y, e.width, e.height);
      } else {
        ctx.beginPath();
        ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2);
        ctx.fillStyle = '#3498db'; ctx.fill(); ctx.closePath();
      }
    });

    // HUD
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '24px Arial';
    ctx.fillText(`Tempo: ${Math.floor(time / 60)}`, 10, 30);

    if (selectedCharacterId === 'character1') {
      ctx.fillText(extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA', 10, 60);
    }
    if (selectedCharacterId === 'character3') {
      ctx.fillText(abilityUsed ? 'Habilidade: USADA' : 'Habilidade: DISPONÍVEL', 10, 90);
    }

    if (gameOver) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Fim de Jogo!', canvas.width/2, canvas.height/2);
    }
  }

  function gameLoop() {
    update();
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
  }

  /* ========= Fim/Reset ========= */
  function endGame() {
    if (gameOver) return;
    gameOver = true;
    clearInterval(enemyInterval);
    const finalScore = Math.floor(time / 60);
    saveScoreToSupabase(userId, userName, finalScore);
    restartButton.style.display = 'block';
  }

  function resetGame() {
    gameOver = false;
    time = 0;
    enemies = [];
    abilityParticles = [];
    player.x = canvas.width/2 - 49;
    player.y = canvas.height/2 - 49;
    restartButton.style.display = 'none';

    gameContainer.style.display = 'none';
    controls.style.display = 'none';
    characterSelectScreen.style.display = 'flex';

    clearInterval(enemyInterval);
    enemyCount = 0;
    abilityUsed = false;
    ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].forEach(k => keys[k] = false);
  }

  restartButton.addEventListener('click', resetGame);
  controlRestartBtn.addEventListener('click', resetGame);

  /* ========= Seleção de personagem (nome 1x) ========= */
  characterOptions.forEach(option => {
    option.addEventListener('click', function() {
      selectedCharacterId = this.id;
      currentPlayerImageSrc = this.dataset.image;
      playerImage.src = currentPlayerImageSrc;

      if (selectedCharacterId === 'character1') { // Piriguete
        extraLife = true; player.speed = 5;
      } else if (selectedCharacterId === 'character2') { // Motoboy
        player.speed = 5 * 1.40; extraLife = false;
      } else { // Malandro
        player.speed = 5; extraLife = false; abilityUsed = false;
      }

      if (!userName) {
        userName = prompt('Digite seu nome para começar o jogo:') || 'Anônimo';
        userId = Date.now().toString();
      }

      showGame();
      startGame();
    });
  });

  /* ========= Iniciar ========= */
  initSponsors();
  showSelect();
});
