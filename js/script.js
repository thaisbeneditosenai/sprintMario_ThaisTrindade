/**
 * Garota Jump - Lógica Completa + Bruxo + Sons 8-bit + Loja de Skins
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configurações e Física Base
    const PIPE_SPEED_BASE = 450;   
    const PIPE_SPEED_MAX = 900;    
    const PIPE_SPEED_GAIN = 2;   
    const CLOUD_SPEED = 50;        
    const GRAVITY = 1600;        
    const JUMP_IMPULSE = -750; 

    // Elementos DOM
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

    // Loja
    const shopModal = document.getElementById('shop-modal');
    const btnShop = document.getElementById('btn-shop');
    const btnCloseShop = document.getElementById('btn-close-shop');
    const shopCoinsDisplay = document.getElementById('shop-coins-display');
    const btnBuyRosa = document.getElementById('btn-buy-rosa');
    const btnSkinGarota = document.getElementById('btn-skin-garota');

    // Bruxo e Feitiços
    const wizardElement = document.getElementById('wizard-element');
    const wizardModal = document.getElementById('wizard-modal');
    const wizardCardType = document.getElementById('wizard-card-type');
    const wizardCardDesc = document.getElementById('wizard-card-desc');
    const btnWizardConfirm = document.getElementById('btn-wizard-confirm');
    const countdownOverlay = document.getElementById('countdown-overlay');

    // Estados do Jogo
    let currentPlayer = '';
    let score = 0;
    let coins = 0;
    let isPlaying = false;
    let isPausedForWizard = false;
    let rafId = null;
    let wizardTimer = null;
    let lastTime = 0;
    let scoreAccumulator = 0;

    // Efeitos Ativos acumulados do Bruxo
    let activeEffects = {
        speedMultiplier: 1.0,
        gravityMultiplier: 1.0,
        screenShake: false
    };

    const WIZARD_EFFECTS = [
        {
            type: 'sorte',
            title: '✨ FEITIÇO DE LEVEZA!',
            desc: 'Sorte! A gravidade diminuiu e a Garota pula mais flutuante!',
            apply: () => { activeEffects.gravityMultiplier = 0.75; }
        },
        {
            type: 'sorte',
            title: '⚡ DESACELERAÇÃO TEMPORAL!',
            desc: 'Sorte! Os canos ficaram mais lentos!',
            apply: () => { activeEffects.speedMultiplier = 0.75; }
        },
        {
            type: 'reves',
            title: '🌪️ TERREMOTO MÁGICO!',
            desc: 'Revés! A visão está trêmula pela fúria do Bruxo!',
            apply: () => { 
                activeEffects.screenShake = true;
                if (gameBoard) gameBoard.classList.add('screen-shake');
            }
        },
        {
            type: 'reves',
            title: '🚀 SUPER VELOCIDADE!',
            desc: 'Revés! Os obstáculos ganharam velocidade extrema!',
            apply: () => { activeEffects.speedMultiplier = 1.35; }
        }
    ];

    // Carteira
    let totalCoins = parseInt(localStorage.getItem('garota_jump_coins') || '0', 10);
    let unlockedSkins = JSON.parse(localStorage.getItem('garota_jump_skins') || '["garota"]');
    let currentSkin = localStorage.getItem('garota_jump_current_skin') || 'garota';

    // Posições
    let boardWidth = gameBoard ? gameBoard.clientWidth : 800;
    let pipeX = boardWidth;
    let cloudX = boardWidth;
    let coinX = boardWidth + 300;
    let coinY = 60;
    let coinVisible = true;

    // Física
    let marioY = 0;        
    let marioVelocityY = 0;
    let isJumping = false;

    new Image().src = 'assets/game-over.png';

    const savedName = localStorage.getItem('garota_jump_player');
    if (savedName && playerInput) playerInput.value = savedName;

    window.addEventListener('resize', () => {
        if (gameBoard) boardWidth = gameBoard.clientWidth;
    });

    // Áudio 8-Bit
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playTone(freq, type, duration) {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playSoundJump() {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }

    function playSoundCoin() {
        playTone(987.77, 'sine', 0.08);
        setTimeout(() => playTone(1318.51, 'sine', 0.2), 80);
    }

    function playSoundGameOver() {
        playTone(300, 'sawtooth', 0.15);
        setTimeout(() => playTone(220, 'sawtooth', 0.2), 150);
        setTimeout(() => playTone(150, 'sawtooth', 0.3), 350);
    }

    // Auxiliares
    function hideAllModals() {
        if (startModal) { startModal.classList.remove('active'); startModal.style.display = 'none'; }
        if (gameoverModal) { gameoverModal.classList.remove('active'); gameoverModal.style.display = 'none'; }
        if (shopModal) { shopModal.classList.remove('active'); shopModal.style.display = 'none'; }
        if (wizardModal) { wizardModal.classList.remove('active'); wizardModal.style.display = 'none'; }
    }

    function showStartModal() {
        hideAllModals();
        if (startModal) { startModal.style.display = 'flex'; startModal.classList.add('active'); }
    }

    function showShopModal() {
        hideAllModals();
        updateShopUI();
        if (shopModal) { shopModal.style.display = 'flex'; shopModal.classList.add('active'); }
    }

    function showGameOverModal() {
        hideAllModals();
        if (gameoverModal) { gameoverModal.style.display = 'flex'; gameoverModal.classList.add('active'); }
    }

    function setTransform(el, x, y = 0) {
        if (el) el.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
    }

    function applySkin(skinName) {
        if (!mario) return;
        mario.classList.remove('skin-filter-rosa');
        if (skinName === 'rosa') {
            mario.classList.add('skin-filter-rosa');
        }
    }

    function clearWizardEffects() {
        if (wizardTimer) clearTimeout(wizardTimer);
        isPausedForWizard = false;
        activeEffects = {
            speedMultiplier: 1.0,
            gravityMultiplier: 1.0,
            screenShake: false
        };
        if (gameBoard) {
            gameBoard.classList.remove('screen-shake', 'fase-roxo', 'fase-carmesim');
        }
        if (wizardElement) wizardElement.classList.remove('active');
        if (countdownOverlay) countdownOverlay.style.display = 'none';
    }

    function resetGame() {

        if (gameBoard) {
        gameBoard.classList.remove('fase-roxo', 'fase-carmesim');
    }

        boardWidth = gameBoard ? gameBoard.clientWidth : 800;
        pipeX = boardWidth + 200;
        cloudX = boardWidth;
        respawnCoin();

        marioY = 0;
        marioVelocityY = 0;
        isJumping = false;

        clearWizardEffects();

        setTransform(pipe, pipeX, 0);
        setTransform(clouds, cloudX, 0);
        setTransform(mario, 0, 0);

        if (mario) {
            mario.src = 'assets/garota.gif';
            applySkin(currentSkin);
            mario.style.width = '';
            mario.style.left = '';
            mario.style.bottom = '';
        }

        if (jumpTip) jumpTip.style.opacity = '1';
    }

    function respawnCoin() {
        coinX = boardWidth + Math.random() * 200 + 300;
        coinY = 40 + Math.random() * 40;
        coinVisible = true;
        if (coin) {
            coin.style.display = 'block';
            setTransform(coin, coinX, coinY);
        }
    }

    // Mecânica do Bruxo
    function scheduleWizard() {
        if (wizardTimer) clearTimeout(wizardTimer);
        if (!isPlaying) return;

        const randomTime = Math.floor(Math.random() * 8000) + 10000;
        wizardTimer = setTimeout(() => {
            if (isPlaying && !isPausedForWizard) {
                triggerWizardEvent();
            }
        }, randomTime);
    }

    function triggerWizardEvent() {
        isPausedForWizard = true;
        playTone(523.25, 'sawtooth', 0.3);

        if (wizardElement) wizardElement.classList.add('active');

        setTimeout(() => {
            const effect = WIZARD_EFFECTS[Math.floor(Math.random() * WIZARD_EFFECTS.length)];
            effect.apply();

            if (wizardCardType) {
                wizardCardType.textContent = effect.title;
                wizardCardType.className = `wizard-card-type ${effect.type}`;
            }
            if (wizardCardDesc) wizardCardDesc.textContent = effect.desc;

            if (wizardElement) wizardElement.classList.remove('active');
            
            hideAllModals();
            if (wizardModal) {
                wizardModal.style.display = 'flex';
                wizardModal.classList.add('active');
            }
        }, 900);
    }

    if (btnWizardConfirm) {
        btnWizardConfirm.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (wizardModal) {
                wizardModal.classList.remove('active');
                wizardModal.style.display = 'none';
            }

            startCountdownResume();
        };
    }

    function startCountdownResume() {
        let count = 3;
        if (countdownOverlay) {
            countdownOverlay.textContent = count;
            countdownOverlay.style.display = 'block';
        }

        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownOverlay) countdownOverlay.textContent = count;
            } else {
                clearInterval(countInterval);
                if (countdownOverlay) countdownOverlay.style.display = 'none';
                
                isPausedForWizard = false;
                lastTime = performance.now();
                scheduleWizard();
            }
        }, 1000);
    }

    // Loop
    function startGame() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        hideAllModals();
        resetGame();

        score = 0;
        coins = 0;
        scoreAccumulator = 0;
        isPlaying = true;
        isPausedForWizard = false;

        if (coinsDisplay) coinsDisplay.textContent = '0';
        if (scoreDisplay) scoreDisplay.textContent = '0';
        if (hudPlayerName) hudPlayerName.textContent = currentPlayer || 'Jogador';

        scheduleWizard();

        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        if (!isPlaying) return;
        if (isPausedForWizard) {
            rafId = requestAnimationFrame(loop);
            return;
        }

        if (!lastTime) lastTime = now;
        let dt = (now - lastTime) / 1000;
        if (dt > 0.03 || dt < 0) dt = 0.016; 
        lastTime = now;

        // Score
        scoreAccumulator += dt * 1000;
        if (scoreAccumulator >= 100) {
            const added = Math.floor(scoreAccumulator / 100);
            score += added;
            scoreAccumulator -= added * 100;
            if (scoreDisplay) scoreDisplay.textContent = score;
        }

        // Fases por Cor
        if (score >= 250) {
            gameBoard.classList.add('fase-carmesim');
            gameBoard.classList.remove('fase-roxo');
        } else if (score >= 100) {
            gameBoard.classList.add('fase-roxo');
        }

        const currentSpeed = Math.min(PIPE_SPEED_MAX, PIPE_SPEED_BASE + score * PIPE_SPEED_GAIN) * activeEffects.speedMultiplier;

        // Cano & Nuvens
        pipeX -= currentSpeed * dt;
        if (pipeX < -100) pipeX = boardWidth;
        setTransform(pipe, pipeX, 0);

        cloudX -= CLOUD_SPEED * dt;
        if (cloudX < -600) cloudX = boardWidth;
        setTransform(clouds, cloudX, 0);

        // Moeda
        if (coinVisible) {
            coinX -= currentSpeed * dt;
            if (coinX < -50) respawnCoin();
            else setTransform(coin, coinX, coinY);
        }

        // Pulo com efeito do Bruxo
        if (isJumping || marioY > 0) {
            marioVelocityY += (GRAVITY * activeEffects.gravityMultiplier) * dt;
            marioY -= marioVelocityY * dt;

            if (marioY <= 0) {
                marioY = 0;
                marioVelocityY = 0;
                isJumping = false;
            }
            setTransform(mario, 0, marioY);
        }

        // Colisão Cano
        if (mario && pipe) {
            const marioRect = mario.getBoundingClientRect();
            const pipeRect = pipe.getBoundingClientRect();

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
        }

        // Coleta
        if (coinVisible && mario && coin) {
            const marioRect = mario.getBoundingClientRect();
            const coinRect = coin.getBoundingClientRect();
            const colidiuMoeda = (
                marioRect.right > coinRect.left &&
                marioRect.left < coinRect.right &&
                marioRect.bottom > coinRect.top &&
                marioRect.top < coinRect.bottom
            );

            if (colidiuMoeda) collectCoin();
        }

        rafId = requestAnimationFrame(loop);
    }

    function jump() {
        if (!isPlaying || isPausedForWizard || isJumping) return;
        isJumping = true;
        marioVelocityY = JUMP_IMPULSE;
        playSoundJump();
        if (jumpTip) jumpTip.style.opacity = '0';
    }

    function collectCoin() {
        coins++;
        totalCoins++;
        localStorage.setItem('garota_jump_coins', totalCoins);
        playSoundCoin();

        if (coinsDisplay) coinsDisplay.textContent = coins;
        coinVisible = false;
        if (coin) coin.style.display = 'none';
        setTimeout(respawnCoin, 2000);
    }

    function triggerGameOver() {
        isPlaying = false;
        isPausedForWizard = false;
        if (rafId) cancelAnimationFrame(rafId);
        playSoundGameOver();

        if (mario) {
            mario.src = 'assets/game-over.png';
            mario.style.width = '75px';
        }

        if (finalScoreValue) finalScoreValue.textContent = score;
        if (finalCoinsValue) finalCoinsValue.textContent = coins;

        if (saveStatusMsg) {
            saveStatusMsg.textContent = 'Salvando pontuação no banco...';
            saveStatusMsg.style.color = '#ffcc00';
        }

        showGameOverModal();
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

    function updateShopUI() {
        if (shopCoinsDisplay) shopCoinsDisplay.textContent = totalCoins;

        if (btnSkinGarota) {
            if (currentSkin === 'garota') {
                btnSkinGarota.textContent = 'EQUIPADO';
                btnSkinGarota.disabled = true;
                btnSkinGarota.className = 'btn btn-skin';
            } else {
                btnSkinGarota.textContent = 'EQUIPAR';
                btnSkinGarota.disabled = false;
                btnSkinGarota.className = 'btn btn-secondary btn-skin';
            }
        }

        if (btnBuyRosa) {
            if (unlockedSkins.includes('rosa')) {
                if (currentSkin === 'rosa') {
                    btnBuyRosa.textContent = 'EQUIPADO';
                    btnBuyRosa.disabled = true;
                    btnBuyRosa.className = 'btn btn-skin';
                } else {
                    btnBuyRosa.textContent = 'EQUIPAR';
                    btnBuyRosa.disabled = false;
                    btnBuyRosa.className = 'btn btn-secondary btn-skin';
                }
            } else {
                btnBuyRosa.textContent = 'COMPRAR';
                btnBuyRosa.disabled = false;
                btnBuyRosa.className = 'btn btn-primary btn-skin';
            }
        }
    }

    // Eventos
    if (startForm) {
        startForm.onsubmit = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const nameValue = playerInput ? playerInput.value.trim() : '';
            if (!nameValue) {
                if (playerInput) playerInput.focus();
                return;
            }

            currentPlayer = nameValue;
            localStorage.setItem('garota_jump_player', currentPlayer);
            startGame();
        };
    }

    if (btnShop) {
        btnShop.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showShopModal();
        };
    }

    if (btnCloseShop) {
        btnCloseShop.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showStartModal();
        };
    }

    if (btnSkinGarota) {
        btnSkinGarota.onclick = (e) => {
            e.preventDefault();
            currentSkin = 'garota';
            localStorage.setItem('garota_jump_current_skin', 'garota');
            applySkin('garota');
            updateShopUI();
        };
    }

    if (btnBuyRosa) {
        btnBuyRosa.onclick = (e) => {
            e.preventDefault();
            if (!unlockedSkins.includes('rosa')) {
                if (totalCoins >= 10) {
                    totalCoins -= 10;
                    localStorage.setItem('garota_jump_coins', totalCoins);
                    unlockedSkins.push('rosa');
                    localStorage.setItem('garota_jump_skins', JSON.stringify(unlockedSkins));
                    currentSkin = 'rosa';
                    localStorage.setItem('garota_jump_current_skin', 'rosa');
                    applySkin('rosa');
                    updateShopUI();
                } else {
                    alert('Moedas insuficientes! Você precisa de 10 moedas.');
                }
            } else {
                currentSkin = 'rosa';
                localStorage.setItem('garota_jump_current_skin', 'rosa');
                applySkin('rosa');
                updateShopUI();
            }
        };
    }

    if (btnViewRanking) {
        btnViewRanking.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fetchRanking();
            if (finalScoreValue) finalScoreValue.textContent = '---';
            if (finalCoinsValue) finalCoinsValue.textContent = '---';
            if (saveStatusMsg) saveStatusMsg.textContent = '';
            showGameOverModal();
        };
    }

    if (btnRestart) {
        btnRestart.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentPlayer) {
                showStartModal();
                if (playerInput) playerInput.focus();
            } else {
                startGame();
            }
        };
    }

    if (btnChangePlayer) {
        btnChangePlayer.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isPlaying = false;
            if (rafId) cancelAnimationFrame(rafId);
            resetGame();
            showStartModal();
            if (playerInput) { playerInput.value = ''; playerInput.focus(); }
        };
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });

    if (gameBoard) {
        gameBoard.addEventListener('pointerdown', () => {
            if (isPlaying) jump();
        });
    }

    if (startModal) startModal.onpointerdown = (e) => e.stopPropagation();
    if (gameoverModal) gameoverModal.onpointerdown = (e) => e.stopPropagation();
    if (shopModal) shopModal.onpointerdown = (e) => e.stopPropagation();
    if (wizardModal) wizardModal.onpointerdown = (e) => e.stopPropagation();

    applySkin(currentSkin);
});