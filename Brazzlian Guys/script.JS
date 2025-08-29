document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bg-music');

  // Telas
  const startScreen = document.getElementById('start-screen');
  const characterSelectScreen = document.getElementById('character-select-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const gameAndUiWrapper = document.getElementById('game-and-ui-wrapper');
  const controls = document.getElementById('controls');
  const titleRow = document.querySelector('.title-row');
  const sponsorsSection = document.getElementById('sponsors-section');

  // Botões
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

  // Controles
  const controlRestartBtn = document.getElementById('control-restart-btn');
  const powerBtns = [document.getElementById('power-btn-1'), document.getElementById('power-btn-2'), document.getElementById('power-btn-3')];

  // UI do Jogo
  const portraitImg = document.getElementById('portrait-img');
  const powerBoxes = [document.getElementById('power-1'), document.getElementById('power-2'), document.getElementById('power-3')];
  
  // Virtudes
  const virtueOptions = document.querySelectorAll('.virtue-option');
  let selectedVirtue = null;

  // Estado do jogo
  let selectedCharacterId = null;
  let extraLife = false;
  let abilityUsed = false;
  let enemyCount = 0;
  let userName = null;
  let score = 0;
  let isTrainingMode = false;
  let lastTime = 0; 
  let projectiles = [];
  let projectileImage = new Image();
  const projectileBaseSize = 30; // base; Maria usa 3x
  let powers = [
    { name: 'Poder 1', cooldown: 500, lastUsed: 0, effect: () => {} },
    { name: 'Poder 2', cooldown: 3000, lastUsed: 0, effect: () => {} },
    { name: 'Poder 3', cooldown: 3000, lastUsed: 0, effect: () => {} }
  ];

  function resizeCanvas() { canvas.width = 1000; canvas.height = 700; }
  resizeCanvas();
  
  const backgroundImage = new Image();
  // ⬇️ Fundo do JOGO (canvas) pela URL solicitada
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
      const endpoint = '/.netlify/functions/top-scores?limit=3';
      try {
          const response = await fetch(endpoint);
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
    if (dx === 0 && dy === 0) dy = -1;

    const len = Math.hypot(dx, dy);
    const projectileSpeed = 800;
    const size = (selectedCharacterId === 'character1') ? projectileBaseSize * 3 : projectileBaseSize; // Maria 200% a mais (3x)
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

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if (['w', 'a', 's', 'd'].includes(key)) return;

    // P1 não dispara pelo teclado
    // if (key === 'z' || key === '1') activatePower(0);

    // Mantidos: P2 e P3 por teclado (X/2 e C/3)
    if (key === 'x' || key === '2') activatePower(1);
    if (key === 'c' || key === '3') activatePower(2);

    keys[key] = true;
    if (e.key === ' ') resetGame();
  });
  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) return;
    keys[key] = false;
  });
  
  function setupMobileControls() {
    const mobileButtonMap = {'up-btn': 'w','down-btn': 's','left-btn': 'a','right-btn': 'd'};
    for (const [btnId, key] of Object.entries(mobileButtonMap)) {
        const btn = document.getElementById(btnId);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; }, { passive: false });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
        // também funciona com mouse (se precisar)
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
        btn.addEventListener('mouseleave', (e) => { e.preventDefault(); keys[key] = false; });
    }
    // P1/P2/P3 no MOBILE (e também no mouse/desktop)
    powerBtns.forEach((btn, index) => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); activatePower(index); }, { passive: false });
        btn.addEventListener('click', (e) => { e.preventDefault(); activatePower(index); });
    });
    controlRestartBtn.addEventListener('touchstart', (e) => { e.preventDefault(); resetGame(); }, { passive: false });
    controlRestartBtn.addEventListener('click', (e) => { e.preventDefault(); resetGame(); });
  }

  async function saveScoreToSupabase(name, points) {
      const endpoint = '/.netlify/functions/submit-score';
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, points }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
      } catch (error) {
        console.error('Falha ao salvar pontuação:', error);
      }
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
    requestAnimationFrame(gameLoop); 
  }

  function update(deltaTime) {
    if (gameOver) return;
    const dt = deltaTime / 1000;

    // Lógica de suavização da barra de vida
    if (Math.abs(player.health - player.visualHealth) < 0.1) {
        player.visualHealth = player.health;
    } else {
        player.visualHealth += (player.health - player.visualHealth) * 0.1;
    }

    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      player.x += (dx / len) * player.speed * dt;
      player.y += (dy / len) * player.speed * dt;
    }
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    enemies.forEach(e => { e.x += e.dx * dt; e.y += e.dy * dt; });
    const now = Date.now();
    if (now - player.lastHitTime >= 500) {
        for (const enemy of enemies) {
            if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
                player.lastHitTime = now;
                if (selectedCharacterId === 'character1' && extraLife) { 
                    extraLife = false; enemy.health = 0; 
                } else {
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
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        let hit = false;
        for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
            const enemy = enemies[eIndex];
            if (p.x < enemy.x + enemy.width && p.x + p.width > enemy.x && p.y < enemy.y + enemy.height && p.y + p.height > enemy.y) {
                enemy.health -= 100;
                hit = true;
                break; 
            }
        }
        if (hit || p.x < -p.width || p.x > canvas.width || p.y < -p.height || p.y > canvas.height) {
            projectiles.splice(pIndex, 1);
        }
    }

    enemies = enemies.filter(e => e.health > 0 && e.x > -e.width && e.x < canvas.width + e.width && e.y > -e.height && e.y < canvas.height + e.height);
    abilityParticles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= deltaTime; });
    abilityParticles = abilityParticles.filter(p => p.life > 0);
    score = Math.round(player.health);

    const currentTime = Date.now();
    powers.forEach((power, index) => {
        const remaining = (power.lastUsed + power.cooldown - currentTime) / 1000;
        const overlay = powerBoxes[index].querySelector('.cooldown-overlay');
        const timeEl = powerBoxes[index].querySelector('.cooldown-time');
        if (remaining > 0) {
            overlay.classList.add('active');
            timeEl.textContent = remaining.toFixed(1);
        } else {
            overlay.classList.remove('active');
            timeEl.textContent = '';
        }
    });
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
    
    if (projectileImage.complete && projectileImage.naturalHeight !== 0) {
        projectiles.forEach(p => {
            ctx.drawImage(projectileImage, p.x, p.y, p.width, p.height);
        });
    }

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
    ctx.fillText(`Vida:`, canvas.width - 300, 30);
    drawHealthBar(canvas.width - 220, 15, 200, 20, player.visualHealth, player.maxHealth); // Usa visualHealth
    if (selectedCharacterId === 'character1') ctx.fillText(extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA', canvas.width - 220, 60);
    if (selectedCharacterId === 'character3') ctx.fillText(abilityUsed ? 'Habilidade (3): USADA' : 'Habilidade (3): DISPONÍVEL', canvas.width - 360, 90);

    if (gameOver) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0, canvas.width, canvas.height); ctx.fillStyle = '#e74c3c'; ctx.font = '48px Arial'; ctx.textAlign = 'center'; ctx.fillText('Fim de Jogo!', canvas.width/2, canvas.height/2); }
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
    score = Math.round(player.health); 
    if (!isTrainingMode) { 
        saveScoreToSupabase(userName, score); 
    } 
    restartButton.style.display = 'block'; 
  }

  function resetGame() { 
      gameOver = false; score = 0; enemies = []; abilityParticles = []; projectiles = [];
      player.x = canvas.width/2 - 49; player.y = canvas.height/2 - 49; player.health = player.maxHealth; 
      player.visualHealth = player.maxHealth; // Reseta a vida visual
      restartButton.style.display = 'none'; clearInterval(enemyInterval); enemyCount = 0; abilityUsed = false; 
      Object.keys(keys).forEach(k => keys[k] = false); 
      powers.forEach(p => p.lastUsed = 0);
      showScreen('select'); 
  }
  
  function setupCharacterPowers(characterId) {
    // ⬇️ P1 = Projétil; P2 = a definir; P3 = Especial do personagem
    powers[0] = { name: 'Projétil', cooldown: 500, lastUsed: 0, effect: fireProjectile };
    powers[1] = { name: 'Poder 2', cooldown: 3000, lastUsed: 0, effect: () => {} };
    powers[2] = { name: 'Especial', cooldown: 3000, lastUsed: 0, effect: () => {} };
    
    if (characterId === 'character3') {
        powers[2].name = "Especial (Raio)";
        powers[2].effect = activateJoaoAbility;
    }

    powerBoxes.forEach((box, index) => {
        box.querySelector('.power-name').textContent = powers[index].name;
    });
  }
  
  virtueOptions.forEach(option => {
      option.addEventListener('click', () => {
          virtueOptions.forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          selectedVirtue = option;
      });
  });

  characterOptions.forEach(option => {
    option.addEventListener('click', function() {
      selectedCharacterId = this.id;
      playerImage.src = this.dataset.image;
      portraitImg.src = this.dataset.portrait;           // ← retrato só na tela de jogo
      projectileImage = new Image();
      projectileImage.src = this.dataset.projectileImg;  // ← projétil por personagem
      
      player.speed = 300;
      player.damageBonus = 0;
      player.damageReduction = 0;
      
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
    });
  });

  loginBtn.addEventListener('click', () => {
    const name = prompt('Digite seu nome para o ranking:');
    userName = (name && name.trim()) ? name.trim() : 'Anônimo';
    isTrainingMode = false;
    showScreen('select');
  });
  trainingBtn.addEventListener('click', () => { isTrainingMode = true; userName = 'Treino'; showScreen('select'); });

  backToStartBtn.addEventListener('click', () => showScreen('start'));
  leaderboardButton.addEventListener('click', () => showScreen('leaderboard'));
  leaderboardReload.addEventListener('click', loadTop3);
  leaderboardBack.addEventListener('click', () => showScreen('select'));
  restartButton.addEventListener('click', resetGame);
  
  initSponsors();
  setupMobileControls();
  showScreen('start');
});
