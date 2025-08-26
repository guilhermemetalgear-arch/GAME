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

  // Patrocinadores (somente imagem)
  const sponsor1File = document.getElementById('sponsor1File');
  const sponsor2File = document.getElementById('sponsor2File');
  const sponsor3File = document.getElementById('sponsor3File');
  const sponsor1Img  = document.getElementById('sponsor1Img');
  const sponsor2Img  = document.getElementById('sponsor2Img');
  const sponsor3Img  = document.getElementById('sponsor3Img');
  const dropZones = document.querySelectorAll('.sponsor-drop');

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
  function activateAbility() {
    if (selectedCharacterId === 'character3' && !abilityUsed) {
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
    if (bgMusic) {
      bgMusic.play().catch(() => {});
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    enemyInterval = setInterval(createEnemy, 1000);
    gameLoop();
  }

  function update() {
    if (gameOver) return;

    if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
    if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['d']) player.x += player.speed;

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

    enemies.forEach(e => { e.x += e.dx; e.y += e.dy; });

    // colisão
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

    // limpa fora da tela
    enemies = enemies.filter(e =>
      e.x > -e.width && e.x < canvas.width + e.width &&
      e.y > -e.height && e.y < canvas.height + e.height
    );

    time++;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage.complete && backgroundImage.naturalHeight !== 0) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#34495e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (playerImage.complete && playerImage.naturalHeight !== 0) {
      ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI*2);
      ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.closePath();
    }

    enemies.forEach(e => {
      if (e.image && e.image.complete && e.image.naturalHeight !== 0) {
        ctx.drawImage(e.image, e.x, e.y, e.width, e.height);
      } else {
        ctx.beginPath();
        ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2);
        ctx.fillStyle = '#3498db'; ctx.fill(); ctx.closePath();
      }
    });

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

  /* ========= Controles mobile ========= */
  upBtn.addEventListener('mousedown', () => keys['ArrowUp'] = true);
  upBtn.addEventListener('mouseup', () => keys['ArrowUp'] = false);
  upBtn.addEventListener('mouseleave', () => keys['ArrowUp'] = false);
  upBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowUp'] = true; });
  upBtn.addEventListener('touchend', e => { e.preventDefault(); keys['ArrowUp'] = false; });
  upBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys['ArrowUp'] = false; });

  downBtn.addEventListener('mousedown', () => keys['ArrowDown'] = true);
  downBtn.addEventListener('mouseup', () => keys['ArrowDown'] = false);
  downBtn.addEventListener('mouseleave', () => keys['ArrowDown'] = false);
  downBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowDown'] = true; });
  downBtn.addEventListener('touchend', e => { e.preventDefault(); keys['ArrowDown'] = false; });
  downBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys['ArrowDown'] = false; });

  leftBtn.addEventListener('mousedown', () => keys['ArrowLeft'] = true);
  leftBtn.addEventListener('mouseup', () => keys['ArrowLeft'] = false);
  leftBtn.addEventListener('mouseleave', () => keys['ArrowLeft'] = false);
  leftBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowLeft'] = true; });
  leftBtn.addEventListener('touchend', e => { e.preventDefault(); keys['ArrowLeft'] = false; });
  leftBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys['ArrowLeft'] = false; });

  rightBtn.addEventListener('mousedown', () => keys['ArrowRight'] = true);
  rightBtn.addEventListener('mouseup', () => keys['ArrowRight'] = false);
  rightBtn.addEventListener('mouseleave', () => keys['ArrowRight'] = false);
  rightBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowRight'] = true; });
  rightBtn.addEventListener('touchend', e => { e.preventDefault(); keys['ArrowRight'] = false; });
  rightBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys['ArrowRight'] = false; });

  aBtn.addEventListener('mousedown', () => activateAbility());
  aBtn.addEventListener('touchstart', e => { e.preventDefault(); activateAbility(); });

  /* ========= Patrocinadores: upload/drag&drop ========= */
  function handleFile(file, imgEl, dropEl) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    imgEl.src = url;
    imgEl.style.display = 'block';
    dropEl.querySelector('.sponsor-hint').style.display = 'none';
  }

  sponsor1File.addEventListener('change', (e) => handleFile(e.target.files?.[0], sponsor1Img, sponsor1File.parentElement));
  sponsor2File.addEventListener('change', (e) => handleFile(e.target.files?.[0], sponsor2Img, sponsor2File.parentElement));
  sponsor3File.addEventListener('change', (e) => handleFile(e.target.files?.[0], sponsor3Img, sponsor3File.parentElement));

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const slot = zone.getAttribute('data-slot');
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (slot === '1') handleFile(file, sponsor1Img, zone);
      if (slot === '2') handleFile(file, sponsor2Img, zone);
      if (slot === '3') handleFile(file, sponsor3Img, zone);
    });
  });

  // Inicia na tela de seleção
  showSelect();
});
