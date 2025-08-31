document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://brazilianguy.netlify.app/.netlify/functions';

  const bgMusic = document.getElementById('bg-music');

  // Telas
  const startScreen = document.getElementById('start-screen');
  const characterSelectScreen = document.getElementById('character-select-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const gameAndUiWrapper = document.getElementById('game-and-ui-wrapper');
  const controls = document.getElementById('controls');
  const titleRow = document.querySelector('.title-row');
  const sponsorsSection = document.getElementById('sponsors-section');

  // Exibição de nome (local e global)
  const userNameDisplay = document.getElementById('user-name-display');
  const globalUserDisplay = document.getElementById('global-user-display');

  // Entrada de login na tela inicial
  const userNameInput = document.getElementById('userNameInput');

  // Botões (INÍCIO)
  const loginBtn = document.getElementById('login-btn');
  const trainingBtn = document.getElementById('training-btn');
  const backToStartBtn = document.getElementById('backToStartBtn');

  // Ranking
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
  const characterOptions = document.querySelectorAll('.character-option');
  const gameOverMessage = document.getElementById('game-over-message');
  const gameOverlay = document.getElementById('game-overlay');

  // Controles (mantém botões de poder e restart)
  const controlRestartBtn = document.getElementById('control-restart-btn');
  const powerBtns = [document.getElementById('power-btn-1'), document.getElementById('power-btn-2'), document.getElementById('power-btn-3')];

  // JOYSTICK
  const joystickBase = document.getElementById('joystick');
  const joystickHandle = joystickBase ? joystickBase.querySelector('.joystick-handle') : null;
  let joystickActive = false;
  let joystickValue = { x: 0, y: 0 }; // normalizado (-1..1)

  // UI do Jogo
  const portraitImg = document.getElementById('portrait-img');
  const powerBoxes = [document.getElementById('power-1'), document.getElementById('power-2'), document.getElementById('power-3')];
  
  // Virtudes
  const virtueOptions = document.querySelectorAll('.virtue-option');
  let selectedVirtue = null;

  // Estado
  let selectedCharacterId = null;
  let extraLife = false;
  let abilityUsed = false;
  let enemyCount = 0;
  let enemiesDefeated = 0;
  let userName = null;
  let score = 0;
  let isTrainingMode = false;
  let lastTime = 0; 
  let gameStartTime = 0;
  let gameDuration = 0;
  let projectiles = [];
  let projectileImage = new Image();
  const projectileBaseSize = 30;
  let lastMoveDir = { dx: 0, dy: -1 };

  let powers = [
    { name: 'Poder 1', cooldown: 500, lastUsed: 0, effect: () => {} },
    { name: 'Poder 2', cooldown: 3000, lastUsed: 0, effect: () => {} },
    { name: 'Poder 3', cooldown: 3000, lastUsed: 0, effect: () => {} }
  ];

  /* ====== Helper universal para botões (touch + click) ====== */
  function bindTap(el, handler) {
    if (!el) return;
    let touched = false;
    el.addEventListener('touchstart', (e) => {
      touched = true;
      // previne apenas o touch para evitar delay de 300ms / ghost click
      e.preventDefault();
      handler();
    }, { passive: false });
    el.addEventListener('click', (e) => {
      // se já tratou via touchstart, ignora o click subsequente
      if (touched) { touched = false; return; }
      handler();
    });
  }

  function setUserName(name) {
    userName = (name && String(name).trim()) || 'Jogador';
    if (globalUserDisplay) globalUserDisplay.textContent = `👤 ${userName}`;
    if (userNameDisplay) userNameDisplay.textContent = userName ? `Olá, ${userName}` : '';
  }

  // Ações de entrada
  bindTap(loginBtn, () => {
    const nameFromInput = userNameInput ? userNameInput.value : '';
    setUserName(nameFromInput);
    isTrainingMode = false;
    showScreen('select');
  });

  bindTap(trainingBtn, () => {
    setUserName('Treino');
    isTrainingMode = true;
    showScreen('select');
  });

  function scaleCharacterSelect() {
    if (characterSelectScreen.style.display === 'none') return;
    characterSelectScreen.style.transform = 'scale(1)';
    const safeBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '0px';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = characterSelectScreen.getBoundingClientRect();
    const safeBottomPx = Number((safeBottom || '0px').replace('px','')) || 0;
    const maxW = vw * 0.95;
    const maxH = (vh - safeBottomPx) * 0.86;
    const scaleW = maxW / rect.width;
    const scaleH = maxH / rect.height;
    const scale = Math.min(1, scaleW, scaleH);
    characterSelectScreen.style.transform = `scale(${scale})`;
    characterSelectScreen.style.marginTop = '8px';
    characterSelectScreen.style.marginBottom = `calc(12px + var(--safe-bottom))`;
  }
  window.addEventListener('resize', () => requestAnimationFrame(scaleCharacterSelect));
  window.addEventListener('orientationchange', () => setTimeout(scaleCharacterSelect, 60));

  function resizeCanvas() { canvas.width = 1000; canvas.height = 700; }
  resizeCanvas();
  
  const backgroundImage = new Image();
  backgroundImage.src = 'https://i.postimg.cc/mr63SMxw/Chat-GPT-Image-29-de-ago-de-2025-19-31-17.png';
  const playerImage = new Image();
  const thunderImg = new Image();
  thunderImg.src = 'https://i.postimg.cc/jSqr4b9t/Pngtree-thunder-and-bolt-flash-vector-4723241.png';
  let abilityParticles = [];
  
  const enemyURLs = ['https://i.postimg.cc/BnTF8rms/Chat-GPT-Image-27-de-ago-de-2025-22-51-05.png','https://i.postimg.cc/3rcYwcHc/blusinha.png','https://i.postimg.cc/Cx4xQMf2/Chat-GPT-Image-28-de-ago-de-2025-22-02-28.png','https://i.postimg.cc/GmK5f63K/Chat-GPT-Image-28-de-ago-de-2025-22-02-37.png','https://i.postimg.cc/25vByNqF/Chat-GPT-Image-28-de-ago-de-2025-22-02-31.png','https://i.postimg.cc/hG3R7qvv/33.jpg','https://i.postimg.cc/3rcYwcHc/blusinha.png','https://i.postimg.cc/Cx4xQMf2/Chat-GPT-Image-28-de-ago-de-2025-22-02-28.png','https://i.postimg.cc/GmK5f63K/Chat-GPT-Image-28-de-ago-de-2025-22-02-37.png','https://i.postimg.cc/25vByNqF/Chat-GPT-Image-28-de-ago-de-2025-22-02-31.png'];
  const movementPatterns = [{ dx: 2, dy: 0 },{ dx: 0, dy: 2 },{ dx: 1.5, dy: 1.5 },{ dx: 3, dy: 0 },{ dx: 1, dy: -2 },{ dx: -1.5, dy: 1.5 },{ dx: 2.5, dy: -1 },{ dx: -2, dy: -2 },{ dx: 3, dy: 3 },{ dx: -3, dy: 0 }];

  const spawnWaves = [{ typeIndex: 0, side: 0, startX: 0, startY: 300 },{ typeIndex: 5, side: 1, startX: 1000, startY: 500 },{ typeIndex: 7, side: 2, startX: 400, startY: 800 },{ typeIndex: 8, side: 3, startX: 0, startY: 100 },{ typeIndex: 9, side: 0, startX: 500, startY: 0 },{ typeIndex: 1, side: 1, startX: 1000, startY: 200 },{ typeIndex: 2, side: 2, startX: 250, startY: 800 },{ typeIndex: 3, side: 3, startX: 0, startY: 600 },{ typeIndex: 4, side: 0, startX: 750, startY: 0 },{ typeIndex: 6, side: 1, startX: 1000, startY: 450 }];

  let player = { x: canvas.width/2 - 49, y: canvas.height/2 - 49, width: 98, height: 98, speed: 300, health: 100, maxHealth: 100, visualHealth: 100, lastHitTime: 0, damageBonus: 0, damageReduction: 0 };
  let enemies = [];
  let gameOver = false;
  let enemyInterval;
  const keys = {};

  function showScreen(screen) {
      [startScreen, characterSelectScreen, leaderboardScreen, gameAndUiWrapper, controls, titleRow, sponsorsSection].forEach(s => s.style.display = 'none');
      if (screen === 'select') {
          characterSelectScreen.style.display = 'flex';
          titleRow.style.display = 'flex';
          sponsorsSection.style.display = 'block';
          if (userNameDisplay) userNameDisplay.textContent = userName ? `Olá, ${userName}` : '';
          if (globalUserDisplay) globalUserDisplay.textContent = userName ? `👤 ${userName}` : '';
          requestAnimationFrame(scaleCharacterSelect);
      } else if (screen === 'game') {
          gameAndUiWrapper.style.display = 'flex';
          controls.style.display = 'flex';
      } else if (screen === 'leaderboard') {
          leaderboardScreen.style.display = 'block';
          loadTop3();
      } else {
          startScreen.style.display = 'flex';
      }
  }

  async function loadTop3() {
    leaderboardList.innerHTML = '<div class="lb-item muted">Carregando...</div>';
    const endpoint = `${API_BASE}/top-scores`;
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const result = await response.json();
      const scores = result.data || [];
      leaderboardList.innerHTML = '';
      if (scores.length === 0) {
        leaderboardList.innerHTML = '<div class="lb-item muted">Nenhuma pontuação registrado.</div>';
        return;
      }
      scores.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'lb-item';
        item.innerHTML = `<div class="lb-pos">${index + 1}</div><div class="lb-name">${entry.user_name || 'Anônimo'}</div><div class="lb-score">${entry.points}</div>`;
        leaderboardList.appendChild(item);
      });
    } catch (error) {
      console.error("Falha ao carregar ranking:", error);
      leaderboardList.innerHTML = '<div class="lb-item muted">Erro ao carregar ranking.</div>';
    }
  }

  function spawnAbilityBurst() {
    const N = 6; const speed = 420; const life = 2000;
    const startX = player.x + player.width / 2;
    const startY = player.y + player.height / 2;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      abilityParticles.push({ x: startX, y: startY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: life, maxLife: life, size: 60 });
    }
  }
  
  function fireProjectile() {
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    // também considera joystick
    dx += joystickValue.x;
    dy += joystickValue.y;

    if (dx === 0 && dy === 0) { dx = lastMoveDir.dx; dy = lastMoveDir.dy; }
    const len = Math.hypot(dx, dy) || 1;
    const projectileSpeed = 800;
    const size = (selectedCharacterId === 'character1') ? projectileBaseSize * 3 : projectileBaseSize;
    projectiles.push({
        x: player.x + player.width / 2 - size / 2,
        y: player.y + player.height / 2 - size / 2,
        width: size,
        height: size,
        vx: (dx / len) * projectileSpeed,
        vy: (dy / len) * projectileSpeed
    });
  }

  function activateJoaoAbility() {
    if (selectedCharacterId === 'character3' && !abilityUsed) {
      spawnAbilityBurst();
      const range = 200;
      enemies.forEach(enemy => {
        const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
        const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
        if (Math.hypot(dx, dy) <= range) enemy.health = 0;
      });
      abilityUsed = true;
    }
  }
  
  function activatePower(index) {
    if (gameOver) return;
    const now = Date.now();
    const power = powers[index];
    if (now - power.lastUsed >= power.cooldown) {
      power.effect();
      power.lastUsed = now;
    }
  }

  // teclado p/ poderes e reinício (barra de espaço)
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if (key === 'x' || key === '2') activatePower(1);
    if (key === 'c' || key === '3') activatePower(2);
    if (e.key === ' ') resetGame();
  });

  function setupMobileControls() {
    // JOYSTICK
    if (!joystickBase || !joystickHandle) return;

    const getCenter = () => {
      const rect = joystickBase.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: Math.min(rect.width, rect.height) / 2 };
    };

    const start = (e) => {
      e.preventDefault();
      joystickActive = true;
      move(e);
    };
    const move = (e) => {
      if (!joystickActive) return;
      const isTouch = e.touches && e.touches.length;
      const ptX = isTouch ? e.touches[0].clientX : (e.clientX ?? 0);
      const ptY = isTouch ? e.touches[0].clientY : (e.clientY ?? 0);
      const c = getCenter();
      const dx = ptX - c.x;
      const dy = ptY - c.y;
      const dist = Math.hypot(dx, dy);
      const max = c.r * 0.85;
      const clamped = dist > max ? max : dist;
      const nx = (dx / (dist || 1)) * (clamped / max);
      const ny = (dy / (dist || 1)) * (clamped / max);
      joystickValue.x = nx;
      joystickValue.y = ny;
      joystickHandle.style.left = `${30 + nx * 42.5}%`;
      joystickHandle.style.top  = `${30 + ny * 42.5}%`;
    };
    const end = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      joystickActive = false;
      joystickValue.x = 0; joystickValue.y = 0;
      joystickHandle.style.left = '30%';
      joystickHandle.style.top  = '30%';
    };

    // Touch
    joystickBase.addEventListener('touchstart', start, { passive: false });
    joystickBase.addEventListener('touchmove',  move,  { passive: false });
    joystickBase.addEventListener('touchend',   end,   { passive: false });
    joystickBase.addEventListener('touchcancel',end,   { passive: false });

    // Mouse / Pointer
    joystickBase.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    // Botões de poder / restart com bindTap
    powerBtns.forEach((btn, index) => bindTap(btn, () => activatePower(index)));
    bindTap(controlRestartBtn, () => resetGame());
  }

  async function saveScoreToSupabase(name, points) {
    const endpoint = `${API_BASE}/submit-score`;
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, points }) });
      if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Erro HTTP: ${response.status}`); }
    } catch (error) { console.error('Falha ao salvar pontuação:', error); }
  }

  function createEnemy() {
    if (gameOver) return;
    const wave = spawnWaves[enemyCount % spawnWaves.length];
    const imageUrl = enemyURLs[wave.typeIndex];
    if (!imageUrl) { enemyCount++; return; }
    const enemy = { x: 0, y: 0, width: 70, height: 70, health: 100, maxHealth: 100, image: new Image() };
    enemy.image.src = imageUrl;
    switch(wave.side) {
      case 0: enemy.x = wave.startX; enemy.y = -enemy.height; break;
      case 1: enemy.x = canvas.width; enemy.y = wave.startY; break;
      case 2: enemy.x = wave.startX; enemy.y = canvas.height; break;
      case 3: enemy.x = -enemy.width; enemy.y = wave.startY; break;
    }
    const pattern = movementPatterns[wave.typeIndex % movementPatterns.length];
    const targetX = canvas.width / 2; const targetY = canvas.height / 2;
    const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    const speed = (Math.hypot(pattern.dx, pattern.dy) || 2) * 60;
    enemy.dx = Math.cos(angle) * speed;
    enemy.dy = Math.sin(angle) * speed;
    enemies.push(enemy);
    enemyCount++;
  }

  function startGame() { 
    if (bgMusic) bgMusic.play().catch(() => {}); 
    resizeCanvas(); 
    enemyInterval = setInterval(createEnemy, 1000); 
    lastTime = 0;
    gameStartTime = Date.now();
    requestAnimationFrame(gameLoop); 
  }

  function update(deltaTime) {
    if (gameOver) return;
    const dt = deltaTime / 1000;
    gameDuration = (Date.now() - gameStartTime) / 1000;
    if (Math.abs(player.health - player.visualHealth) < 0.1) player.visualHealth = player.health;
    else player.visualHealth += (player.health - player.visualHealth) * 0.1;

    // Direção via teclado + JOYSTICK
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    dx += joystickValue.x;
    dy += joystickValue.y;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const ux = dx / len;
      const uy = dy / len;
      player.x += ux * player.speed * dt;
      player.y += uy * player.speed * dt;
      lastMoveDir = { dx: ux, dy: uy };
    }
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    enemies.forEach(e => { e.x += e.dx * dt; e.y += e.dy * dt; });
    const now = Date.now();
    if (now - player.lastHitTime >= 500) {
      for (const enemy of enemies) {
        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
          player.lastHitTime = now;
          if (selectedCharacterId === 'character1' && extraLife) { extraLife = false; enemy.health = 0; }
          else {
            const damageToPlayer = 35 * (1 - player.damageReduction);
            const damageToEnemy = 34 * (1 + player.damageBonus);
            enemy.health -= damageToEnemy;
            player.health -= damageToPlayer;
            if (player.health <= 0) { player.health = 0; endGame(); break; }
          }
        }
      }
    }
    
    for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
      const p = projectiles[pIndex];
      p.x += p.vx * dt; p.y += p.vy * dt;
      let hit = false;
      for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
        const enemy = enemies[eIndex];
        if (p.x < enemy.x + enemy.width && p.x + p.width > enemy.x && p.y < enemy.y + enemy.height && p.y + p.height > enemy.y) {
          enemy.health -= 100;
          if (enemy.health <= 0) {
              enemiesDefeated++;
          }
          hit = true;
          break;
        }
      }
      if (hit || p.x < -p.width || p.x > canvas.width || p.y < -p.height || p.y > canvas.height) projectiles.splice(pIndex, 1);
    }

    enemies = enemies.filter(e => e.health > 0 && e.x > -e.width && e.x < canvas.width + e.width && e.y > -e.height && e.y < canvas.height + e.height);
    abilityParticles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= deltaTime; });
    abilityParticles = abilityParticles.filter(p => p.life > 0);
    
    const currentTime = Date.now();
    powers.forEach((power, index) => {
      const remaining = (power.lastUsed + power.cooldown - currentTime) / 1000;
      const overlay = powerBoxes[index].querySelector('.cooldown-overlay');
      const timeEl = powerBoxes[index].querySelector('.cooldown-time');
      if (remaining > 0) { overlay.classList.add('active'); timeEl.textContent = remaining.toFixed(1); }
      else { overlay.classList.remove('active'); timeEl.textContent = ''; }
    });
  }

  function drawHealthBar(x, y, width, height, health, maxHealth) {
    ctx.fillStyle = '#333'; ctx.fillRect(x, y, width, height);
    const healthWidth = (health / maxHealth) * width;
    ctx.fillStyle = health > maxHealth * 0.6 ? '#2ecc71' : health > maxHealth * 0.3 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x, y, healthWidth > 0 ? healthWidth : 0, height);
    ctx.strokeStyle = '#ecf0f1'; ctx.strokeRect(x, y, width, height);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const backgroundImageReady = backgroundImage.complete && backgroundImage.naturalHeight !== 0;
    if (backgroundImageReady) ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    if (projectileImage.complete && projectileImage.naturalHeight !== 0) projectiles.forEach(p => { ctx.drawImage(projectileImage, p.x, p.y, p.width, p.height); });
    const thunderReady = thunderImg.complete && thunderImg.naturalHeight !== 0;
    abilityParticles.forEach(p => {
      const t = p.life / p.maxLife, size = p.size * t, angle = Math.atan2(p.vy, p.vx);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
      if (thunderReady) { ctx.globalAlpha = Math.max(0.2, t); ctx.drawImage(thunderImg, -size/2, -size/2, size, size); }
      ctx.restore();
    });
    if (playerImage.complete) ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    enemies.forEach(e => {
      if (e.image && e.image.complete && e.image.naturalHeight !== 0) ctx.drawImage(e.image, e.x, e.y, e.width, e.height);
      else { ctx.beginPath(); ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2); ctx.fillStyle = '#3498db'; ctx.fill(); ctx.closePath(); }
      drawHealthBar(e.x, e.y - 15, e.width, 8, e.health, e.maxHealth);
    });
    ctx.fillStyle = '#ecf0f1'; ctx.font = '24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Monstros derrotados: ${enemiesDefeated}`, 10, 30);
    ctx.fillText(`Tempo: ${gameDuration.toFixed(1)}s`, 10, 60);
    ctx.fillText(`Vida:`, canvas.width - 300, 30);
    drawHealthBar(canvas.width - 220, 15, 200, 20, player.visualHealth, player.maxHealth);
    if (selectedCharacterId === 'character1') ctx.fillText(extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA', canvas.width - 220, 60);
    if (selectedCharacterId === 'character3') ctx.fillText(abilityUsed ? 'Habilidade (3): USADA' : 'Habilidade (3): DISPONÍVEL', canvas.width - 360, 90);
  }
  
  function gameLoop(currentTime) { 
    if (gameOver) return;
    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    update(deltaTime);
    draw(); 
    requestAnimationFrame(gameLoop); 
  }
  
  function endGame() { 
    if (gameOver) return; 
    gameOver = true; 
    clearInterval(enemyInterval); 
    score = Math.round(enemiesDefeated * gameDuration);

    if (!isTrainingMode) saveScoreToSupabase(userName, score);
    
    gameOverlay.style.display = 'flex';
    gameOverMessage.textContent = `PARABÉNS!! SUA PONTUAÇÃO FOI DE ${score}`;
  }

  function resetGame() { 
    gameOver = false; enemiesDefeated = 0; enemies = []; abilityParticles = []; projectiles = [];
    player.x = canvas.width/2 - 49; player.y = canvas.height/2 - 49; player.health = player.maxHealth; 
    player.visualHealth = player.maxHealth;
    gameOverlay.style.display = 'none'; clearInterval(enemyInterval); enemyCount = 0; abilityUsed = false; 
    joystickValue.x = 0; joystickValue.y = 0;
    if (joystickHandle) { joystickHandle.style.left = '30%'; joystickHandle.style.top = '30%'; }
    powers.forEach(p => p.lastUsed = 0);
    showScreen('select'); 
  }
  
  function setupCharacterPowers(characterId) {
    powers[0] = { name: 'Projétil', cooldown: 500, lastUsed: 0, effect: fireProjectile };
    powers[1] = { name: 'Poder 2', cooldown: 3000, lastUsed: 0, effect: () => {} };
    powers[2] = { name: 'Especial', cooldown: 3000, lastUsed: 0, effect: () => {} };
    if (characterId === 'character3') { powers[2].name = "Especial (Raio)"; powers[2].effect = activateJoaoAbility; }
    powerBoxes.forEach((box, index) => { box.querySelector('.power-name').textContent = powers[index].name; });
  }
  
  virtueOptions.forEach(option => {
    option.addEventListener('click', () => {
      virtueOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedVirtue = option;
    });
  });

  characterOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.preventDefault();
      selectedCharacterId = this.id;
      const playerImageUrl = this.dataset.image;
      const portraitUrl = this.dataset.portrait;
      const projectileUrl = this.dataset.projectileImg;
      if (playerImageUrl) { const tmp = new Image(); tmp.onload = () => { playerImage.src = playerImageUrl; }; tmp.src = playerImageUrl; } else { playerImage.src = ''; }
      portraitImg.src = portraitUrl || '';
      projectileImage = new Image();
      projectileImage.src = projectileUrl || '';
      player.speed = 300; player.damageBonus = 0; player.damageReduction = 0;
      if (selectedCharacterId === 'character1') { extraLife = true; } 
      else if (selectedCharacterId === 'character2') { player.speed *= 1.40; extraLife = false; } 
      else { extraLife = false; abilityUsed = false; }
      if (selectedVirtue) {
        player.speed *= (1 + parseFloat(selectedVirtue.dataset.speed));
        player.damageBonus += parseFloat(selectedVirtue.dataset.damage);
        player.damageReduction += parseFloat(selectedVirtue.dataset.reduction);
      }
      setupCharacterPowers(selectedCharacterId);
      showScreen('game'); 
      startGame();
    }, { passive: false });
    option.addEventListener('touchend', function(e){ e.preventDefault(); this.click(); }, { passive: false });
  });

  bindTap(backToStartBtn, () => showScreen('start'));
  bindTap(leaderboardButton, () => showScreen('leaderboard'));
  bindTap(leaderboardReload, () => loadTop3());
  bindTap(leaderboardBack, () => showScreen('select'));
  bindTap(restartButton, () => resetGame());
  
  initSponsors();

  if (globalUserDisplay) globalUserDisplay.textContent = '';
  setupMobileControls();
  showScreen('start');
});
