document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const restartButton = document.getElementById('restartButton');

    // Aumenta o tamanho da tela
    canvas.width = 1000;
    canvas.height = 800;

    const backgroundImage = new Image();
    backgroundImage.src = 'https://i.postimg.cc/ZqYwCNXK/gettyimages-1129409998-2048x2048.jpg';

    const playerImage = new Image();
    playerImage.src = 'https://i.postimg.cc/63yzhX9k/792-7927606-sad-meme-face-forever-alone-guy.jpg';

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

    const keys = {};
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Função para resetar o jogo
    function resetGame() {
        gameOver = false;
        time = 0;
        enemies = [];
        player.x = canvas.width / 2 - 25;
        player.y = canvas.height / 2 - 25;
        restartButton.style.display = 'none';
        gameLoop();
    }

    // Evento de clique para o botão de reiniciar
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

    setInterval(createEnemy, 1000);

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

        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

        enemies.forEach(enemy => {
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
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
        requestAnimationFrame(gameLoop);
    }

    let imagesLoaded = 0;
    const totalImages = 3;

    function imageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            gameLoop();
        }
    }

    backgroundImage.onload = imageLoaded;
    playerImage.onload = imageLoaded;
    enemyImage.onload = imageLoaded;
});