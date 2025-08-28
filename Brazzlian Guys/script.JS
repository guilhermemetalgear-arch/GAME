document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bg-music');

  // Telas
  const startScreen = document.getElementById('start-screen');
  const characterSelectScreen = document.getElementById('character-select-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const gameContainer = document.getElementById('game-container');
  const controls = document.getElementById('controls');
  const titleRow = document.querySelector('.title-row');
  const sponsorsSection = document.getElementById('sponsors-section');

  // Botões
  const loginBtn = document.getElementById('login-btn');
  const trainingBtn = document.getElementById('training-btn');
  const backToStartBtn = document.getElementById('backToStartBtn'); // NOVO: Botão Voltar

  // Ranking interno
  const leaderboardButton = document.getElementById('leaderboardButton');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardReload = document.getElementById('leaderboardReload');
  const leaderboardBack = document.getElementById('leaderboardBack');

  // Patrocinadores
  const SPONSOR_URLS = ['https://i.postimg.cc/NMqJb8Mm/ali.jpg','',''];
  const sponsorImgs = [document.getElementById('sponsor1Img'),document.getElementById('sponsor2Img'),document.getElementById('sponsor3Img')];
  function initSponsors() { sponsorImgs.forEach((img, idx) => { const url = SPONSOR_URLS[idx]; const item = img.closest('.sponsor-item'); if (url) { img.src = url; item.style.display = 'block'; } else { item.style.display = 'none'; } }); }

  // Elementos do jogo
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const restartButton = document.getElementById('restartButton');

  // Controles mobile
  const zBtn = document.getElementById('z-btn');
  const controlRestartBtn = document.getElementById('control-restart-btn');

  const characterOptions = document.querySelectorAll('.character-option');

  // Estado do jogo
  let selectedCharacterId = null;
  let extraLife = false;
  let abilityUsed = false;
  let enemyCount = 0;
  let userName = null;
  let userId = null;
  let score = 0;
  let isTrainingMode = false;

  function resizeCanvas() { canvas.width = 1000; canvas.height = 800; }
  resizeCanvas();
  
  const backgroundImage = new Image();
  backgroundImage.src = 'https://i.postimg.cc/c19wL0CG/1-rocinha-favela-closeup.jpg';
  const playerImage = new Image();

  const thunderImg = new Image();
  thunderImg.src = 'https://i.postimg.cc/jSqr4b9t/Pngtree-thunder-and-bolt-flash-vector-4723241.png';
  let abilityParticles = [];
  let lastMove = { x: 1, y: 0 };

  // Inimigos (URLs, padrões de movimento, etc.)
  const enemyURLs = ['https://i.postimg.cc/hG3R7qvv/33.jpg','https://i.postimg.cc/3rcYwcHc/blusinha.png','https://i.postimg.cc/bv92cjWM/3.jpg','https://i.postimg.cc/tgz7mQMg/Ovos-PNG-Transparente-Sem-Fundo.png','https://i.postimg.cc/Y0h4WL0K/6.jpg','https://i.postimg.cc/hG3R7qvv/33.jpg','https://i.postimg.cc/3rcYwcHc/blusinha.png','https://i.postimg.cc/bv92cjWM/3.jpg','https://i.postimg.cc/tgz7mQMg/Ovos-PNG-Transparente-Sem-Fundo.png','https://i.postimg.cc/Y0h4WL0K/6.jpg'];
  const movementPatterns = [{ dx: 2, dy: 0 },{ dx: 0, dy: 2 },{ dx: 1.5, dy: 1.5 },{ dx: 3, dy: 0 },{ dx: 1, dy: -2 },{ dx: -1.5, dy: 1.5 },{ dx: 2.5, dy: -1 },{ dx: -2, dy: -2 },{ dx: 3, dy: 3 },{ dx: -3, dy: 0 }];
  const spawnWaves = [{ typeIndex: 0, side: 0, startX: 0, startY: 300 },{ typeIndex: 5, side: 1, startX: 1000, startY: 500 },{ typeIndex: 7, side: 2, startX: 400, startY: 800 },{ typeIndex: 8, side: 3, startX: 0, startY: 100 },{ typeIndex: 9, side: 0, startX: 500, startY: 0 },{ typeIndex: 1, side: 1, startX: 1000, startY: 200 },{ typeIndex: 2, side: 2, startX: 250, startY: 800 },{ typeIndex: 3, side: 3, startX: 0, startY: 600 },{ typeIndex: 4, side: 0, startX: 750, startY: 0 },{ typeIndex: 6, side: 1, startX: 1000, startY: 450 }];

  let player = { x: canvas.width/2 - 49, y: canvas.height/2 - 49, width: 98, height: 98, speed: 5, health: 100, maxHealth: 100, lastHitTime: 0 };
  let enemies = [];
  let gameOver = false;
  let time = 0;
  let enemyInterval;
  const keys = {};

  function showScreen(screen) {
      [startScreen, characterSelectScreen, leaderboardScreen, gameContainer, controls, titleRow, sponsorsSection].forEach(s => s.style.display = 'none');
      if (screen === 'select') {
          characterSelectScreen.style.display = 'flex';
          titleRow.style.display = 'flex';
          sponsorsSection.style.display = 'block';
      } else if (screen === 'game') {
          gameContainer.style.display = 'flex';
          controls.style.display = 'flex';
      } else if (screen === 'leaderboard') {
          leaderboardScreen.style.display = 'block';
          loadTop3();
      } else {
          startScreen.style.display = 'flex';
      }
  }

  async function loadTop3() {
    leaderboardList.innerHTML = ''; 
    const fakeData = [
        { user_name: 'Herói da Laje', score: 95 },
        { user_name: 'Dona Maria', score: 80 },
        { user_name: 'Anônimo', score: 50 }
    ].sort((a, b) => b.score - a.score);
    
    if (fakeData.length === 0) {
        leaderboardList.innerHTML = '<div class="lb-item muted">Nenhuma pontuação registrada ainda.</div>';
        return;
    }

    fakeData.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'lb-item';
        item.innerHTML = `
            <div class="lb-pos">${index + 1}</div>
            <div class="lb-name">${entry.user_name || 'Anônimo'}</div>
            <div class="lb-score">${entry.score}</div>
        `;
        leaderboardList.appendChild(item);
    });
  }

  function spawnAbilityBurst() {
    const N = 6;
    const speed = 7;
    const life = 120;
    
    const startX = player.x + player.width / 2;
    const startY = player.y + player.height / 2;

    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      abilityParticles.push({
        x: startX,
        y: startY,
        vx,
        vy,
        life: life,
        maxLife: life,
        size: 60,
      });
    }
  }

  function activateAbility() {
    if (selectedCharacterId === 'character3' && !abilityUsed) {
        spawnAbilityBurst();
        const range = 200;
        enemies.forEach(enemy => {
            const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
            const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
            if (Math.hypot(dx, dy) <= range) {
                enemy.health = 0; // ATUALIZADO: Pontos não são mais somados aqui
            }
        });
        abilityUsed = true;
    }
  }
  
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'z'].includes(key)) { e.preventDefault(); }
    if (['w', 'a', 's', 'd'].includes(key)) { return; }
    if (key === 'z') activateAbility();
    keys[key] = true;
    if (e.key === ' ') resetGame();
  });
  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) { return; }
    keys[key] = false;
  });
  
  function setupMobileControls() {
    const mobileButtonMap = {'up-btn': 'w','down-btn': 's','left-btn': 'a','right-btn': 'd'};
    for (const [btnId, key] of Object.entries(mobileButtonMap)) {
        const btn = document.getElementById(btnId);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; }, { passive: false });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
    }
    zBtn.addEventListener('touchstart', (e) => { e.preventDefault(); activateAbility(); }, { passive: false });
    controlRestartBtn.addEventListener('touchstart', (e) => { e.preventDefault(); resetGame(); }, { passive: false });
  }

  async function saveScoreToSupabase(userId, userName, points) {
    console.log(`Simulando salvamento: Usuário: ${userName}, Pontos: ${points}`);
  }

  function createEnemy() {
    if (gameOver) return;
    const wave = spawnWaves[enemyCount % spawnWaves.length];
    const typeIndex = wave.typeIndex;
    const imageUrl = enemyURLs[typeIndex];
    if (!imageUrl) { enemyCount++; return; }
    const enemy = { x: 0, y: 0, width: 70, height: 70, health: 100, maxHealth: 100, image: new Image() };
    enemy.image.src = imageUrl;
    switch(wave.side) {
        case 0: enemy.x = wave.startX; enemy.y = -enemy.height; break;
        case 1: enemy.x = canvas.width; enemy.y = wave.startY; break;
        case 2: enemy.x = wave.startX; enemy.y = canvas.height; break;
        case 3: enemy.x = -enemy.width; enemy.y = wave.startY; break;
    }
    const pattern = movementPatterns[typeIndex % movementPatterns.length];
    const targetX = canvas.width / 2;
    const targetY = canvas.height / 2;
    const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    const speed = Math.hypot(pattern.dx, pattern.dy) || 2;
    enemy.dx = Math.cos(angle) * speed;
    enemy.dy = Math.sin(angle) * speed;
    enemies.push(enemy);
    enemyCount++;
  }

  function startGame() { if (bgMusic) { bgMusic.play().catch(() => {}); } resizeCanvas(); enemyInterval = setInterval(createEnemy, 1000); gameLoop(); }

  function update() {
    if (gameOver) return;
    
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); lastMove = { x: dx / len, y: dy / len }; }
    player.y += (dy * player.speed);
    player.x += (dx * player.speed);
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    enemies.forEach(e => { e.x += e.dx; e.y += e.dy; });

    const now = Date.now();
    const isInvulnerable = (now - player.lastHitTime < 500);
    if (!isInvulnerable) {
        for (const enemy of enemies) {
            if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
                player.lastHitTime = now;
                // ATUALIZADO: Lógica de dano sem somar pontos
                if (selectedCharacterId === 'character1' && extraLife) { 
                    extraLife = false; 
                    enemy.health = 0; 
                } else {
                    const damageToEnemy = 34; 
                    const damageToPlayer = 35;
                    enemy.health -= damageToEnemy; 
                    player.health -= damageToPlayer;
                    if (player.health <= 0) { 
                        player.health = 0; 
                        endGame(); 
                        break; 
                    }
                }
            }
        }
    }

    enemies = enemies.filter(e => e.health > 0 && e.x > -e.width && e.x < canvas.width + e.width && e.y > -e.height && e.y < canvas.height + e.height);
    
    abilityParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    abilityParticles = abilityParticles.filter(p => p.life > 0);

    // ATUALIZADO: Pontuação é sempre igual à vida restante.
    score = player.health;
    
    time++;
  }

  function drawHealthBar(x, y, width, height, health, maxHealth) {
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, height);
    const healthWidth = (health / maxHealth) * width;
    ctx.fillStyle = health > maxHealth * 0.6 ? '#2ecc71' : health > maxHealth * 0.3 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x, y, healthWidth > 0 ? healthWidth : 0, height);
    ctx.strokeStyle = '#ecf0f1';
    ctx.strokeRect(x, y, width, height);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage.complete) ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    
    abilityParticles.forEach(p => {
        const t = p.life / p.maxLife;
        const size = p.size * t;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        if (thunderImg.complete && thunderImg.naturalHeight !== 0) {
            ctx.globalAlpha = Math.max(0.2, t);
            ctx.drawImage(thunderImg, -size/2, -size/2, size, size);
        }
        ctx.restore();
    });

    if (playerImage.complete) ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    
    enemies.forEach(e => {
        if (e.image && e.image.complete && e.image.naturalHeight !== 0) { ctx.drawImage(e.image, e.x, e.y, e.width, e.height); } 
        else { ctx.beginPath(); ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2); ctx.fillStyle = '#3498db'; ctx.fill(); ctx.closePath(); }
        drawHealthBar(e.x, e.y - 15, e.width, 8, e.health, e.maxHealth);
    });

    ctx.fillStyle = '#ecf0f1'; ctx.font = '24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Pontuação: ${score}`, 10, 30);
    ctx.fillText(`Vida:`, 10, 60);
    drawHealthBar(70, 45, 200, 20, player.health, player.maxHealth);
    if (selectedCharacterId === 'character1') ctx.fillText(extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA', 10, 90);
    if (selectedCharacterId === 'character3') ctx.fillText(abilityUsed ? 'Habilidade: USADA' : 'Habilidade: DISPONÍVEL (Z)', 10, 120);

    if (gameOver) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0, canvas.width, canvas.height); ctx.fillStyle = '#e74c3c'; ctx.font = '48px Arial'; ctx.textAlign = 'center'; ctx.fillText('Fim de Jogo!', canvas.width/2, canvas.height/2); }
  }

  function gameLoop() { if (!gameOver) { update(); draw(); requestAnimationFrame(gameLoop); } }
  
  function endGame() { 
    if (gameOver) return; 
    gameOver = true; 
    clearInterval(enemyInterval); 
    // ATUALIZADO: Garante que a pontuação final seja a vida no momento do game over
    score = player.health; 
    if (!isTrainingMode) { 
        saveScoreToSupabase(userId, userName, score); 
    } 
    restartButton.style.display = 'block'; 
  }

  function resetGame() { 
      gameOver = false; 
      time = 0; 
      score = 0; 
      enemies = []; 
      abilityParticles = []; 
      player.x = canvas.width/2 - 49; 
      player.y = canvas.height/2 - 49; 
      player.health = player.maxHealth; 
      restartButton.style.display = 'none'; 
      clearInterval(enemyInterval); 
      enemyCount = 0; 
      abilityUsed = false; 
      Object.keys(keys).forEach(k => keys[k] = false); 
      showScreen('select'); 
  }
  
  characterOptions.forEach(option => {
    option.addEventListener('click', function() {
      selectedCharacterId = this.id;
      playerImage.src = this.dataset.image;
      if (selectedCharacterId === 'character1') { extraLife = true; player.speed = 5; } 
      else if (selectedCharacterId === 'character2') { player.speed = 5 * 1.40; extraLife = false; } 
      else { player.speed = 5; extraLife = false; abilityUsed = false; }
      if (!userName && !isTrainingMode) { userName = prompt('Digite seu nome para o ranking:') || 'Anônimo'; userId = Date.now().toString(); } 
      else if (isTrainingMode) { userName = 'Treino'; }
      showScreen('game'); startGame();
    });
  });

  loginBtn.addEventListener('click', () => { isTrainingMode = false; showScreen('select'); });
  trainingBtn.addEventListener('click', () => { isTrainingMode = true; showScreen('select'); });
  backToStartBtn.addEventListener('click', () => showScreen('start'));
  leaderboardButton.addEventListener('click', () => showScreen('leaderboard'));
  leaderboardReload.addEventListener('click', loadTop3);
  leaderboardBack.addEventListener('click', () => showScreen('select'));
  restartButton.addEventListener('click', resetGame);
  
  initSponsors();
  setupMobileControls();
  showScreen('start');
});