document.addEventListener('DOMContentLoaded', () => {

    const bgMusic = document.getElementById('bg-music');
    const characterSelectScreen = document.getElementById('character-select-screen');
    const characterOptions = document.querySelectorAll('.character-option');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const restartButton = document.getElementById('restartButton');
    const controls = document.getElementById('controls');

    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const aBtn = document.getElementById('a-btn');
    const controlRestartBtn = document.getElementById('control-restart-btn');

    let selectedCharacterId = null;
    let extraLife = false;
    let enemyCount = 0;
    let abilityUsed = false;
    let score = 0;

    // NOVO: Variáveis globais para o jogador
    let userName = null;
    let userId = null;

    function resizeCanvas() {
        const gameContainerRect = gameContainer.getBoundingClientRect();
        canvas.width = gameContainerRect.width;
        canvas.height = gameContainer.getBoundingClientRect().height;
    }

    canvas.width = 1000;
    canvas.height = 800;

    const backgroundImage = new Image();
    backgroundImage.src = 'https://i.postimg.cc/c19wL0CG/1-rocinha-favela-closeup.jpg';

    const playerImage = new Image();
    let currentPlayerImageSrc = '';

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

    function activateAbility() {
        if (selectedCharacterId === 'character3' && !abilityUsed) {
            const range = 200;
            enemies = enemies.filter(enemy => {
                const distance = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
                return distance > range;
            });
            abilityUsed = true;
        }
    }

    function resetMovementState() {
        keys['ArrowUp'] = false;
        keys['ArrowDown'] = false;
        keys['ArrowLeft'] = false;
        keys['ArrowRight'] = false;
        keys['w'] = false;
        keys['s'] = false;
        keys['a'] = false;
        keys['d'] = false;
    }

    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
            e.preventDefault();
        }
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

    async function saveScoreToSupabase(userId, userName, points) {
        try {
            const response = await fetch('/.netlify/functions/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, points }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.body || 'Failed to save score');
            }
            const data = await response.json();
            console.log('Score saved successfully:', data);
        } catch (error) {
            console.error('Failed to save score:', error);
        }
    }

    function endGame() {
        if (gameOver) return;
        gameOver = true;
        clearInterval(enemyInterval);
        const finalScore = Math.floor(time / 60);

        // Agora usa o nome informado no INÍCIO
        saveScoreToSupabase(userId, userName, finalScore);

        restartButton.style.display = 'block';
    }

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
        enemyCount = 0;
        abilityUsed = false;
        resetMovementState();
    }

    restartButton.addEventListener('click', resetGame);
    controlRestartBtn.addEventListener('click', resetGame);

    function createEnemy() {
        if (gameOver) return;
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

        enemyCount++;
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
        if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
        if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
        if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
        if (keys['ArrowRight'] || keys['d']) player.x += player.speed;

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
                if (selectedCharacterId === 'character1' && extraLife) {
                    extraLife = false;
                    enemies = enemies.filter(e => e !== enemy);
                } else {
                    endGame();
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

        if (selectedCharacterId === 'character1') {
            const status = extraLife ? 'Vida Extra: ATIVA' : 'Vida Extra: INATIVA';
            ctx.fillText(status, 10, 60);
        }
        if (selectedCharacterId === 'character3') {
            const status = abilityUsed ? 'Habilidade: USADA' : 'Habilidade: DISPONÍVEL';
            ctx.fillText(status, 10, 90);
        }
        if (gameOver) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Fim de Jogo!', canvas.width / 2, canvas.height / 2);
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

            if (selectedCharacterId === 'character1') {
                extraLife = true;
                player.speed = 5;
            } else if (selectedCharacterId === 'character2') {
                player.speed = 5 * 1.40;
                extraLife = false;
            } else {
                player.speed = 5;
                extraLife = false;
                abilityUsed = false;
            }

            // NOVO: Solicita nome apenas uma vez no início
            if (!userName) {
                userName = prompt('Digite seu nome para começar o jogo:') || 'Anônimo';
                userId = Date.now().toString();
            }

            characterSelectScreen.style.display = 'none';
            gameContainer.style.display = 'flex';
            controls.style.display = 'flex';

            startGame();
        });
    });

    // Botões de controle
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

    aBtn.addEventListener('mousedown', () => activateAbility());
    aBtn.addEventListener('touchstart', (e) => { e.preventDefault(); activateAbility(); });

    controlRestartBtn.addEventListener('mousedown', () => resetGame());
    controlRestartBtn.addEventListener('touchstart', (e) => { e.preventDefault(); resetGame(); });
});
