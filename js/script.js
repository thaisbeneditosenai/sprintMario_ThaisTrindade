/**
 * Mario Jump - Lógica do Jogo (Corrigida e Otimizada)
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configurações de Balanço
    const PIPE_SPEED_BASE = 450;   
    const PIPE_SPEED_MAX = 900;    
    const PIPE_SPEED_GAIN = 2;   
    const CLOUD_SPEED = 50;        
    const GRAVITY = 1600;        
    const JUMP_IMPULSE = -750; 

    // Elementos do DOM
    const mario = document.querySelector('.mario');
    const pipe = document.querySelector('.pipe');
    const coin = document.querySelector('.coin');
    const clouds = document.querySelector('.clouds');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const coinsDisplay = document.getElementById('coins-display');
    const jumpTip = document.getElementById('jump-tip');

    // Modais
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

    // Estados do Jogo
    let currentPlayer = '';
    let score = 0;
    let coins = 0;
    let isPlaying = false;
    let rafId = null;
    let lastTime = 0;
    let scoreAccumulator = 0;

    // Posições
    let boardWidth = gameBoard.clientWidth;
    let pipeX = boardWidth;
    let cloudX = boardWidth;
    let coinX = boardWidth + 300;
    let coinY = 60;
    let coinVisible = true;

    // Física do Mario
    let marioY = 0;        
    let marioVelocityY = 0;
    let isJumping = false;

    // Pré-carrega a imagem de Game Over
    new Image().src = 'assets/game-over.png';

    const savedName = localStorage.getItem('garota_jump_player');
    if (savedName && playerInput) playerInput.value = savedName;

    window.addEventListener('resize', () => {
        boardWidth = gameBoard.clientWidth;
    });

    function setTransform(el, x, y = 0) {
        el.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
    }

    function resetGame() {
        boardWidth = gameBoard.clientWidth;
        pipeX = boardWidth + 200; // Nascimento fora da tela
        cloudX = boardWidth;
        respawnCoin();

        marioY = 0;
        marioVelocityY = 0;
        isJumping = false;

        setTransform(pipe, pipeX, 0);
        setTransform(clouds, cloudX, 0);
        setTransform(mario, 0, 0);

        mario.src = 'assets/garota.gif';
        mario.style.width = '';
        mario.style.left = '';
        mario.style.bottom = '';

        if (jumpTip) jumpTip.style.opacity = '1';
    }

    function respawnCoin() {
    coinX = boardWidth + Math.random() * 200 + 300;
    coinY = 40 + Math.random() * 40; 
    coinVisible = true;
    coin.style.display = 'block';
    setTransform(coin, coinX, coinY);
}

    function startGame() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        // Fecha Modais
        if (startModal) {
            startModal.classList.remove('active');
            startModal.style.display = 'none';
        }
        if (gameoverModal) {
            gameoverModal.classList.remove('active');
            gameoverModal.style.display = 'none';
        }

        resetGame();

        score = 0;
        coins = 0;
        scoreAccumulator = 0;
        isPlaying = true;

        if (coinsDisplay) coinsDisplay.textContent = '0';
        if (scoreDisplay) scoreDisplay.textContent = '0';
        if (hudPlayerName) hudPlayerName.textContent = currentPlayer || 'Jogador';

        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        if (!isPlaying) return;

        if (!lastTime) lastTime = now;

        let dt = (now - lastTime) / 1000;
        if (dt > 0.03 || dt < 0) {
            dt = 0.016; 
        }
        lastTime = now;

        // 1. Atualização do Score
        scoreAccumulator += dt * 1000;
        if (scoreAccumulator >= 100) {
            const added = Math.floor(scoreAccumulator / 100);
            score += added;
            scoreAccumulator -= added * 100;
            scoreDisplay.textContent = score;
        }

        // 2. Velocidade atual
        const currentSpeed = Math.min(PIPE_SPEED_MAX, PIPE_SPEED_BASE + score * PIPE_SPEED_GAIN);

        // 3. Movimentação dos Obstáculos
        pipeX -= currentSpeed * dt;
        if (pipeX < -100) pipeX = boardWidth;
        setTransform(pipe, pipeX, 0);

        cloudX -= CLOUD_SPEED * dt;
        if (cloudX < -600) cloudX = boardWidth;
        setTransform(clouds, cloudX, 0);

        // 4. Movimentação da Moeda
        if (coinVisible) {
            coinX -= currentSpeed * dt;
            if (coinX < -50) {
                respawnCoin();
            } else {
                setTransform(coin, coinX, coinY);
            }
        }

        // 5. Física do Pulo
        if (isJumping || marioY > 0) {
            marioVelocityY += GRAVITY * dt;
            marioY -= marioVelocityY * dt;

            if (marioY <= 0) {
                marioY = 0;
                marioVelocityY = 0;
                isJumping = false;
            }
            setTransform(mario, 0, marioY);
        }

        // 6. Detecção de Colisão Precisa
        const marioRect = mario.getBoundingClientRect();
        const pipeRect = pipe.getBoundingClientRect();

        // Só testa colisão se o cano já entrou na área útil do tabuleiro
        if (pipeRect.left < boardWidth) {
            const paddingX = 25; 
            const paddingTop = 20;

            const colidiuCano = (
                marioRect.right - paddingX > pipeRect.left &&
                marioRect.left + paddingX < pipeRect.right &&
                marioRect.bottom > pipeRect.top + paddingTop
            );

            if (colidiuCano) {
                triggerGameOver();
                return;
            }
        }

        // 7. Coleta de Moeda
        if (coinVisible) {
            const coinRect = coin.getBoundingClientRect();
            const colidiuMoeda = (
                marioRect.right > coinRect.left &&
                marioRect.left < coinRect.right &&
                marioRect.bottom > coinRect.top &&
                marioRect.top < coinRect.bottom
            );

            if (colidiuMoeda) {
                collectCoin();
            }
        }

        rafId = requestAnimationFrame(loop);
    }

    function jump() {
        if (!isPlaying || isJumping) return;
        isJumping = true;
        marioVelocityY = JUMP_IMPULSE;
        if (jumpTip) jumpTip.style.opacity = '0';
    }

    function collectCoin() {
        coins++;
        if (coinsDisplay) coinsDisplay.textContent = coins;
        coinVisible = false;
        coin.style.display = 'none';
        setTimeout(respawnCoin, 2000);
    }

    function triggerGameOver() {
        isPlaying = false;
        if (rafId) cancelAnimationFrame(rafId);

        mario.src = 'assets/game-over.png';
        mario.style.width = '75px';

        if (finalScoreValue) finalScoreValue.textContent = score;
        if (finalCoinsValue) finalCoinsValue.textContent = coins;

        if (saveStatusMsg) {
            saveStatusMsg.textContent = 'Salvando pontuação no banco...';
            saveStatusMsg.style.color = '#ffcc00';
        }

        if (gameoverModal) {
            gameoverModal.style.display = 'flex';
            gameoverModal.classList.add('active');
        }

        saveScore(currentPlayer, score, coins);
    }

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
            if (saveStatusMsg) {
                if (data.status === 'success' || data.success) {
                    saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                    saveStatusMsg.style.color = '#10b981';
                    if (data.ranking) renderRanking(data.ranking, playerName, finalScore);
                } else {
                    saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                    saveStatusMsg.style.color = '#ef4444';
                }
            }
        })
        .catch(() => {
            if (saveStatusMsg) {
                saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor.';
                saveStatusMsg.style.color = '#ef4444';
            }
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

            html += `<tr${cls}>
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
                <td>🪙 ${parseInt(item.moedas || 0, 10)}</td>
            </tr>`;
        });

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

    // ====== EVENTOS ======

    if (startForm) {
        startForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const nameValue = playerInput.value.trim();
            if (!nameValue) {
                playerInput.focus();
                return;
            }

            currentPlayer = nameValue;
            localStorage.setItem('garota_jump_player', currentPlayer);

            startGame();
        });
    }

    if (btnViewRanking) {
        btnViewRanking.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            fetchRanking();
            if (finalScoreValue) finalScoreValue.textContent = '---';
            if (finalCoinsValue) finalCoinsValue.textContent = '---';
            if (saveStatusMsg) saveStatusMsg.textContent = '';
            
            if (startModal) {
                startModal.classList.remove('active');
                startModal.style.display = 'none';
            }
            if (gameoverModal) {
                gameoverModal.style.display = 'flex';
                gameoverModal.classList.add('active');
            }
        });
    }

    if (btnRestart) {
        btnRestart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!currentPlayer) {
                if (startModal) {
                    startModal.style.display = 'flex';
                    startModal.classList.add('active');
                }
                if (playerInput) playerInput.focus();
            } else {
                startGame();
            }
        });
    }

    if (btnChangePlayer) {
        btnChangePlayer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isPlaying = false;
            if (rafId) cancelAnimationFrame(rafId);
            resetGame();

            if (gameoverModal) {
                gameoverModal.classList.remove('active');
                gameoverModal.style.display = 'none';
            }

            if (startModal) {
                startModal.style.display = 'flex';
                startModal.classList.add('active');
            }
            if (playerInput) {
                playerInput.value = '';
                playerInput.focus();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });

    gameBoard.addEventListener('pointerdown', () => {
        if (isPlaying) {
            jump();
        }
    });

    if (startModal) startModal.addEventListener('pointerdown', (e) => e.stopPropagation());
    if (gameoverModal) gameoverModal.addEventListener('pointerdown', (e) => e.stopPropagation());
});