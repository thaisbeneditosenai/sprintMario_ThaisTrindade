/**
 * Mario Jump - Lógica do Jogo (otimizada) + Ranking MySQL
 */
 
document.addEventListener('DOMContentLoaded', () => {
    // ====== AJUSTES DO JOGO (mexa aqui para balancear) ======
    const PIPE_SPEED_BASE = 600;   // px/s no início
    const PIPE_SPEED_MAX = 1000;   // px/s no máximo
    const PIPE_SPEED_GAIN = 3;     // px/s a mais por ponto
    const COIN_SPEED_RATIO = 0.6;  // moeda anda a 60% da velocidade do cano
    const CLOUD_SPEED = 70;        // px/s
    const JUMP_HEIGHT = 180;       // px
    const JUMP_TIME = 500;         // ms
    const PIPE_WIDTH = 80;
    const COIN_SIZE = 35;
    const CLOUD_WIDTH = 550;
 
    // Elementos do Jogo
    const mario = document.querySelector('.mario');
    const pipe = document.querySelector('.pipe');
    const coin = document.querySelector('.coin');
    const clouds = document.querySelector('.clouds');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const coinsDisplay = document.getElementById('coins-display');
    const jumpTip = document.getElementById('jump-tip');
 
    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');
 
    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const finalCoinsValue = document.getElementById('final-coins-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');
 
    // Estado
    let currentPlayer = '';
    let score = 0;
    let coins = 0;
    let isPlaying = false;
    let rafId = null;
    let lastTime = 0;
    let scoreTimer = 0;
 
    // Posições (px, relativas ao início do tabuleiro)
    let boardW = gameBoard.clientWidth;
    let pipeX = boardW;
    let coinX = boardW;
    let coinVisible = true;
    let cloudX = boardW;
 
    // Pulo
    let jumping = false;
    let jumpStart = 0;
    let marioY = 0; // altura atual do Mario (px acima do chão)
 
    // Pré-carrega a imagem de game over (evita piscar na troca)
    new Image().src = 'assets/game-over.png';
 
    // Recupera último nome utilizado
    const savedName = localStorage.getItem('mario_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }
 
    window.addEventListener('resize', () => {
        if (!isPlaying) boardW = gameBoard.clientWidth;
    });
 
    // ====== Helpers de desenho ======
    function place(el, x, y = 0) {
        el.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
    }
 
    function easeOut(t) {
        return 1 - (1 - t) * (1 - t);
    }
 
    // Curva do pulo (mesmo desenho da animação CSS antiga: sobe, segura, desce)
    function jumpHeightAt(t) {
        if (t < 0.4) return JUMP_HEIGHT * easeOut(t / 0.4);
        if (t < 0.5) return JUMP_HEIGHT;
        return JUMP_HEIGHT * (1 - easeOut((t - 0.5) / 0.5));
    }
 
    // ====== Controle do jogo ======
    function resetElements() {
        boardW = gameBoard.clientWidth;
        pipeX = boardW;
        coinX = boardW;
        cloudX = boardW;
        coinVisible = true;
        jumping = false;
        marioY = 0;
 
        place(pipe, pipeX);
        place(clouds, cloudX);
        place(coin, coinX);
        coin.style.display = 'block';
 
        mario.src = 'assets/garota.gif';
        mario.style.transform = '';
        mario.style.width = '';
        mario.style.left = '';
        mario.style.bottom = '';
 
        if (jumpTip) jumpTip.style.opacity = '1';
    }
 
    function startGame() {
        cancelAnimationFrame(rafId);
        resetElements();
 
        score = 0;
        coins = 0;
        scoreTimer = 0;
        isPlaying = true;
 
        if (coinsDisplay) coinsDisplay.textContent = '0';
        if (scoreDisplay) scoreDisplay.textContent = '0';
        if (hudPlayerName) hudPlayerName.textContent = currentPlayer || 'Jogador';
 
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }
 
    function loop(now) {
        if (!isPlaying) return;
 
        // dt em segundos, limitado para não "teleportar" se a aba ficar em segundo plano
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
 
        // Pontuação: 1 ponto a cada 100ms
        scoreTimer += dt * 1000;
        if (scoreTimer >= 100) {
            const gained = Math.floor(scoreTimer / 100);
            score += gained;
            scoreTimer -= gained * 100;
            scoreDisplay.textContent = score;
        }
 
        // Velocidade cresce com a pontuação
        const pipeSpeed = Math.min(PIPE_SPEED_MAX, PIPE_SPEED_BASE + score * PIPE_SPEED_GAIN);
 
        // Cano
        pipeX -= pipeSpeed * dt;
        if (pipeX < -PIPE_WIDTH) pipeX = boardW;
        place(pipe, pipeX);
 
        // Nuvens
        cloudX -= CLOUD_SPEED * dt;
        if (cloudX < -CLOUD_WIDTH) cloudX = boardW;
        place(clouds, cloudX);
 
        // Moeda
        coinX -= pipeSpeed * COIN_SPEED_RATIO * dt;
        if (coinX < -COIN_SIZE) {
            coinX = boardW;
            coinVisible = true;
            coin.style.display = 'block';
        }
        place(coin, coinX);
 
        // Mario (pulo)
        if (jumping) {
            const t = (now - jumpStart) / JUMP_TIME;
            if (t >= 1) {
                jumping = false;
                marioY = 0;
            } else {
                marioY = jumpHeightAt(t);
            }
            place(mario, 0, marioY);
        }
 
        // Colisões (usa só números, sem ler o layout)
        if (pipeX <= 150 && pipeX > 0 && marioY < 80) {
            triggerGameOver();
            return;
        }
 
        if (coinVisible && coinX <= 120 && coinX > 50 && marioY > 60) {
            collectCoin();
        }
 
        rafId = requestAnimationFrame(loop);
    }
 
    function jump() {
        if (!isPlaying || jumping) return;
        jumping = true;
        jumpStart = performance.now();
        if (jumpTip) jumpTip.style.opacity = '0';
    }
 
    function collectCoin() {
        coins++;
        coinsDisplay.textContent = coins;
        coinVisible = false;
        coin.style.display = 'none'; // volta sozinha quando a próxima moeda entrar
    }
 
    function triggerGameOver() {
        isPlaying = false;
        cancelAnimationFrame(rafId);
 
        // Congela o Mario na altura atual e troca para a imagem de Game Over
        mario.src = 'assets/game-over.png';
        mario.style.width = '75px';
        mario.style.left = '70px';
        mario.style.bottom = '0px';
 
        if (finalScoreValue) finalScoreValue.textContent = score;
        if (finalCoinsValue) finalCoinsValue.textContent = coins;
 
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';
 
        gameoverModal.classList.add('active');
        saveScore(currentPlayer, score, coins);
    }
 
    // ====== Ranking (MySQL via PHP) ======
    function saveScore(playerName, finalScore, finalCoins) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore,
                moedas: finalCoins
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' || data.success) {
                saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                saveStatusMsg.style.color = '#10b981';
                if (data.ranking) {
                    renderRanking(data.ranking, playerName, finalScore);
                }
            } else {
                saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
            saveStatusMsg.style.color = '#ef4444';
        });
    }
 
    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if ((data.status === 'success' || data.success) && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }
 
    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
 
        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="4" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }
 
        let highlighted = false;
        let html = '';
 
        list.forEach((item, index) => {
            let cls = '';
            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                cls = ' class="highlight-current"';
                highlighted = true;
            }
 
            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';
 
            const itemMoedas = item.moedas !== undefined ? item.moedas : 0;
 
            html += `<tr${cls}>
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
                <td>🪙 ${parseInt(itemMoedas, 10)}</td>
            </tr>`;
        });
 
        // Uma única atualização do DOM
        rankingBody.innerHTML = html;
    }
 
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
 
    // ====== Eventos ======
    startForm.addEventListener('submit', (e) => {
        e.preventDefault();
 
        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }
 
        currentPlayer = nameValue;
        localStorage.setItem('mario_jump_player', currentPlayer);
 
        startModal.classList.remove('active');
        startGame();
    });
 
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        if (finalScoreValue) finalScoreValue.textContent = '---';
        if (finalCoinsValue) finalCoinsValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });
 
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });
 
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        isPlaying = false;
        cancelAnimationFrame(rafId);
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });
 
    // Teclado: Espaço ou Seta para Cima
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
 
    // Clique / toque no tabuleiro (a dica na tela promete isso)
    gameBoard.addEventListener('pointerdown', jump);
 
    // Posição inicial dos elementos
    resetElements();
});