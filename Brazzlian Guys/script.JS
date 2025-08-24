document.addEventListener('DOMContentLoaded', () => {
  
  const bgMusic = document.getElementById('bg-music');
    const characterSelectScreen = document.getElementById('character-select-screen');
    const characterOptions = document.querySelectorAll('.character-option');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const restartButton = document.getElementById('restartButton');
    const controls = document.getElementById('controls');

    // Referências para os novos botões de controle
    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const aBtn = document.getElementById('a-btn');
    const controlRestartBtn = document.getElementById('control-restart-btn');

    // Variáveis globais para as habilidades dos personagens
    let selectedCharacterId = null;
    let extraLife = false;
    let enemyCount = 0; // Contador para controlar a ordem de spawn dos inimigos
    let abilityUsed = false; // Adicionada variável para o Garoto Esperto

    // Função para redimensionar o canvas
    function resizeCanvas() {
        const gameContainerRect = gameContainer.getBoundingClientRect();
        canvas.width = gameContainerRect.width;
        canvas.height = gameContainer.getBoundingClientRect().height;
    }

    // Aumenta o tamanho da tela
    canvas.width = 1000;
    canvas.height = 800;

    const backgroundImage = new Image();
    backgroundImage.src = 'https://i.postimg.cc/c19wL0CG/1-rocinha-favela-closeup.jpg';

    const playerImage = new Image();
    let currentPlayerImageSrc = '';

    // URLs para os diferentes tipos de inimigos (Pontos B)
    const enemyURLs = [
        'https://i.postimg.cc/q7mjnRdc/PT-Brazil-logo-svg.png',  // B1
        'https://i.postimg.cc/3rcYwcHc/blusinha.png',    // B2
        'https://i.postimg.cc/bv92cjWM/3.jpg',       // B3
        'https://i.postimg.cc/tgz7mQMg/Ovos-PNG-Transparente-Sem-Fundo.png', // B4
        'https://i.postimg.cc/Y0h4WL0K/6.jpg',       // B5
        'URL_DA_IMAGEM_B6',
        'URL_DA_IMAGEM_B7',
        'URL_DA_IMAGEM_B8',
        'URL_DA_IMAGEM_B9',
        'URL_DA_IMAGEM_B10'
    ];

    // Padrões de movimento para cada inimigo
    const movementPatterns = [
        // Padrão para B1: movimento da esquerda para a direita
        { dx: 2, dy: 0 },
        // Padrão para B2: movimento de cima para baixo
        { dx: 0, dy: 2 },
        // Padrão para B3: movimento diagonal
        { dx: 1.5, dy: 1.5 },
        // Padrão para B4: movimento horizontal rápido
        { dx: 3, dy: 0 },
        // Padrão para B5: movimento em ziguezague
        { dx: 1, dy: -2 },
        // Padrões de exemplo para os demais B
        { dx: -1.5, dy: 1.5 },
        { dx: 2.5, dy: -1 },
        { dx: -2, dy: -2 },
        { dx: 3, dy: 3 },
        { dx: -3, dy: 0 }
    ];

    // Define a sequência de inimigos para o jogo.
    // Cada objeto define o tipo de inimigo (`typeIndex`), a posição de partida (`startX`, `startY`) e o lado de onde ele virá (`side`).
    const spawnWaves = [
        // O `side` agora serve apenas como referência visual no código, mas a posição é fixa.
        { typeIndex: 0, side: 0, startX: 0, startY: 300 }, // B1 da esquerda, no meio da altura
        { typeIndex: 5, side: 1, startX: 1000, startY: 500 }, // B6 da direita
        { typeIndex: 7, side: 2, startX: 400, startY: 800 }, // B8 de baixo
        { typeIndex: 8, side: 3, startX: 0, startY: 100 }, // B9 da esquerda
        { typeIndex: 9, side: 0, startX: 500, startY: 0 }, // B10 de cima
        { typeIndex: 1, side: 1, startX: 1000, startY: 200 }, // B2 da direita
        { typeIndex: 2, side: 2, startX: 250, startY: 800 }, // B3 de baixo
        { typeIndex: 3, side: 3, startX: 0, startY: 600 }, // B4 da esquerda
        { typeIndex: 4, side: 0, startX: 750, startY: 0 }, // B5 de cima
        { typeIndex: 6, side: 1, startX: 1000, startY: 450 }, // B7 da direita
    ];

    let player = {
        x: canvas.width / 2 - 49,
        y: canvas.height / 2 - 49,
        width: 98,
        height: 98,
        speed: 5
    };

    let enemies = [];
    let gameOver = false;
    let time = 0;
    let enemyInterval;

    const keys = {};

    // Função para a habilidade do Personagem 3 (Garoto Esperto)
    function activateAbility() {
        if (selectedCharacterId === 'character3' && !abilityUsed) {
            const range = 200; // Raio de ação para eliminar inimigos
            enemies = enemies.filter(enemy => {
                const distance = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
                return distance > range;
            });
            abilityUsed = true; // Marca a habilidade como usada
        }
    }

    window.addEventListener('keydown', (e) => {
        // Previne a rolagem da tela ao usar as teclas de movimento
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
            e.preventDefault();
        }

        // Habilidade do Garoto Esperto: remover inimigos próximos ao apertar 'A'
        if (e.key.toLowerCase() === 'a') {
            activateAbility();
        }

        keys[e.key] = true;

        if (e.key === ' ') {
            resetGame();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    function resetGame() {
        gameOver = false;
        time = 0;
        enemies = [];
        player.x = canvas.width / 2 - 49;
        player.y = canvas.height / 2 - 49;
        restartButton.style.display = 'none';
        
        gameContainer.style.display = 'none';
        characterSelectScreen.style.display = 'flex';
        controls.style.display = 'none';
        
        clearInterval(enemyInterval);
        enemyCount = 0; // Reseta o contador de inimigos para repetir o padrão
        abilityUsed = false; // Reseta o uso da habilidade
    }

    restartButton.addEventListener('click', resetGame);

    function createEnemy() {
        if (gameOver) return;
        
        // Pega o próximo objeto de onda de spawn da sequência
        const wave = spawnWaves[enemyCount % spawnWaves.length];
        const index = wave.typeIndex;

        const enemySize = 40 * 1.6;
        
        const pattern = movementPatterns[index];
        const enemyURL = enemyURLs[index];

        const enemyImage = new Image();
        enemyImage.src = enemyURL;

        enemies.push({
            x: wave.startX,
            y: wave.startY,
            width: enemySize,
            height: enemySize,
            dx: pattern.dx,
            dy: pattern.dy,
            image: enemyImage
        });
        
        enemyCount++; // Incrementa o contador para o próximo inimigo
    }

    function startGame() {
      
      if (bgMusic) {
    bgMusic.play().catch(err => {
        console.log("Reprodução bloqueada até interação do usuário:", err);
    });
}
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        enemyInterval = setInterval(createEnemy, 1000);
        gameLoop();
    }

    function update() {
        if (gameOver) return;

        if (keys['ArrowUp'] || keys['w']) {
            player.y -= player.speed;
        }
        if (keys['ArrowDown'] || keys['s']) {
            player.y += player.speed;
        }
        if (keys['ArrowLeft'] || keys['a']) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] || keys['d']) {
            player.x += player.speed;
        }

        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        enemies.forEach(enemy => {
            enemy.x += enemy.dx;
            enemy.y += enemy.dy;
        });

        enemies.forEach(enemy => {
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                // Lógica de colisão
                if (selectedCharacterId === 'character1' && extraLife) {
                    extraLife = false; // Perde a vida extra
                    // Remove o inimigo que causou a colisão
                    enemies = enemies.filter(e => e !== enemy);
                } else {
                    gameOver = true;
                    clearInterval(enemyInterval);
                }
            }
        });

        enemies = enemies.filter(enemy =>
            enemy.x > -enemy.width && enemy.x < canvas.width + enemy.width &&
            enemy.y > -enemy.height && enemy.y < canvas.height + enemy.height
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
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.closePath();
        }

        enemies.forEach(enemy => {
            if (enemy.image && enemy.image.complete && enemy.image.naturalHeight !== 0) {
                ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#3498db';
                ctx.fill();
                ctx.closePath();
            }
        });

        ctx.fillStyle = '#ecf0f1';
        ctx.font = '24px Arial';
        ctx.fillText(`Tempo: ${Math.floor(time / 60)}`, 10, 30);

        // Exibe o status da vida extra do Garoto Inocente
        if (selectedCharacterId === 'character1') {
            const status = extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA';
            ctx.fillText(status, 10, 60);
        }
        
        // Exibe o status da habilidade do Garoto Esperto
        if (selectedCharacterId === 'character3') {
            const status = abilityUsed ? 'Habilidade: USADA' : 'Habilidade: DISPONÍVEL';
            ctx.fillText(status, 10, 90);
        }
        
        if (gameOver) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Fim de Jogo!', canvas.width / 2, canvas.height / 2);
            restartButton.style.display = 'block';
        }
    }

    function gameLoop() {
        update();
        draw();
        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        }
    }

    characterOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectedCharacterId = this.id;
            currentPlayerImageSrc = this.dataset.image;
            playerImage.src = currentPlayerImageSrc;

            // Ajusta as propriedades do jogador com base no personagem selecionado
            if (selectedCharacterId === 'character1') {
                extraLife = true;
                player.speed = 5; // Velocidade padrão
            } else if (selectedCharacterId === 'character2') {
                player.speed = 5 * 1.40; // Aumenta a velocidade em 40%
                extraLife = false;
            } else { // character3
                player.speed = 5; // Velocidade padrão
                extraLife = false;
                abilityUsed = false; // Garante que a habilidade esteja disponível no início
            }

            characterSelectScreen.style.display = 'none';
            gameContainer.style.display = 'flex';
            controls.style.display = 'flex';
            
            startGame();
        });
    });

    // Eventos de toque para os botões, com e.preventDefault()
    upBtn.addEventListener('mousedown', () => keys['ArrowUp'] = true);
    upBtn.addEventListener('mouseup', () => keys['ArrowUp'] = false);
    upBtn.addEventListener('mouseleave', () => keys['ArrowUp'] = false);
    upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = true; });
    upBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
    upBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });

    downBtn.addEventListener('mousedown', () => keys['ArrowDown'] = true);
    downBtn.addEventListener('mouseup', () => keys['ArrowDown'] = false);
    downBtn.addEventListener('mouseleave', () => keys['ArrowDown'] = false);
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowDown'] = true; });
    downBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowDown'] = false; });
    downBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); keys['ArrowDown'] = false; });

    leftBtn.addEventListener('mousedown', () => keys['ArrowLeft'] = true);
    leftBtn.addEventListener('mouseup', () => keys['ArrowLeft'] = false);
    leftBtn.addEventListener('mouseleave', () => keys['ArrowLeft'] = false);
    leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
    leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
    leftBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });

    rightBtn.addEventListener('mousedown', () => keys['ArrowRight'] = true);
    rightBtn.addEventListener('mouseup', () => keys['ArrowRight'] = false);
    rightBtn.addEventListener('mouseleave', () => keys['ArrowRight'] = false);
    rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
    rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
    rightBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });

    // Eventos para o novo botão 'A'
    aBtn.addEventListener('mousedown', () => activateAbility());
    aBtn.addEventListener('touchstart', (e) => { e.preventDefault(); activateAbility(); });

    controlRestartBtn.addEventListener('mousedown', () => resetGame());
    controlRestartBtn.addEventListener('touchstart', (e) => { e.preventDefault(); resetGame(); });
});