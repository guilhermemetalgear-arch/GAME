document.addEventListener('DOMContentLoaded', () => {
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

    // Aumenta o tamanho da tela
    canvas.width = 1000;
    canvas.height = 800;

    const backgroundImage = new Image();
    backgroundImage.src = 'https://i.postimg.cc/ZqYwCNXK/gettyimages-1129409998-2048x2048.jpg';

    const playerImage = new Image();
    let currentPlayerImageSrc = '';

    const enemyImage = new Image();
    enemyImage.src = 'https://i.postimg.cc/q7mjnRdc/PT-Brazil-logo-svg.png';

    let player = {
        x: canvas.width / 2 - 25,
        y: canvas.height / 2 - 25,
        width: 50,
        height: 50,
        speed: 5
    };

    let enemies = [];
    let gameOver = false;
    let time = 0;
    let enemyInterval;

    const keys = {};
    window.addEventListener('keydown', (e) => {
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
        player.x = canvas.width / 2 - 25;
        player.y = canvas.height / 2 - 25;
        restartButton.style.display = 'none';
        
        gameContainer.style.display = 'none';
        characterSelectScreen.style.display = 'flex';
        controls.style.display = 'none';
        
        clearInterval(enemyInterval);
    }

    restartButton.addEventListener('click', resetGame);

    function createEnemy() {
        if (gameOver) return;
        
        const side = Math.floor(Math.random() * 4);
        let x, y, dx, dy;
        const enemySize = 40;

        switch (side) {
            case 0:
                x = Math.random() * canvas.width - enemySize / 2;
                y = -enemySize;
                dx = (Math.random() - 0.5) * 2;
                dy = Math.random() * 2 + 1;
                break;
            case 1:
                x = canvas.width + enemySize;
                y = Math.random() * canvas.height - enemySize / 2;
                dx = -(Math.random() * 2 + 1);
                dy = (Math.random() - 0.5) * 2;
                break;
            case 2:
                x = Math.random() * canvas.width - enemySize / 2;
                y = canvas.height + enemySize;
                dx = (Math.random() - 0.5) * 2;
                dy = -(Math.random() * 2 + 1);
                break;
            case 3:
                x = -enemySize;
                y = Math.random() * canvas.height - enemySize / 2;
                dx = Math.random() * 2 + 1;
                dy = (Math.random() - 0.5) * 2;
                break;
        }

        enemies.push({
            x,
            y,
            width: enemySize,
            height: enemySize,
            dx,
            dy
        });
    }

    function startGame() {
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
                gameOver = true;
                clearInterval(enemyInterval);
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
            if (enemyImage.complete && enemyImage.naturalHeight !== 0) {
                ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
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
            currentPlayerImageSrc = this.dataset.image;
            playerImage.src = currentPlayerImageSrc;
            characterSelectScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            controls.style.display = 'flex';
            
            startGame();
        });
    });

    // Lógica para os botões de controle de tela (agora com suporte a mouse e toque)
    upBtn.addEventListener('mousedown', () => keys['ArrowUp'] = true);
    upBtn.addEventListener('mouseup', () => keys['ArrowUp'] = false);
    upBtn.addEventListener('mouseleave', () => keys['ArrowUp'] = false);
    upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = true; });
    upBtn.addEventListener('touchend', () => keys['ArrowUp'] = false);

    downBtn.addEventListener('mousedown', () => keys['ArrowDown'] = true);
    downBtn.addEventListener('mouseup', () => keys['ArrowDown'] = false);
    downBtn.addEventListener('mouseleave', () => keys['ArrowDown'] = false);
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowDown'] = true; });
    downBtn.addEventListener('touchend', () => keys['ArrowDown'] = false);

    leftBtn.addEventListener('mousedown', () => keys['ArrowLeft'] = true);
    leftBtn.addEventListener('mouseup', () => keys['ArrowLeft'] = false);
    leftBtn.addEventListener('mouseleave', () => keys['ArrowLeft'] = false);
    leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
    leftBtn.addEventListener('touchend', () => keys['ArrowLeft'] = false);

    rightBtn.addEventListener('mousedown', () => keys['ArrowRight'] = true);
    rightBtn.addEventListener('mouseup', () => keys['ArrowRight'] = false);
    rightBtn.addEventListener('mouseleave', () => keys['ArrowRight'] = false);
    rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
    rightBtn.addEventListener('touchend', () => keys['ArrowRight'] = false);
});