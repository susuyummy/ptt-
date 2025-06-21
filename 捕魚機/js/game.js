// 主遊戲類
class FishingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 遊戲狀態
        this.gameState = 'loading'; // loading, playing, paused, gameOver
        this.score = GAME_CONFIG.INITIAL_SCORE;
        this.isRunning = false;
        this.isPaused = false;
        
        // 賭注系統 - 添加安全檢查
        this.coins = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.INITIAL_COINS : 1000;
        this.currentBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.DEFAULT_BET : 5;
        this.totalBetAmount = 0;  // 總下注金額
        this.totalWinAmount = 0;  // 總獲勝金額
        
        // 遊戲系統
        this.fishManager = null;
        this.cannon = null;
        this.bullets = [];
        this.particles = [];
        
        // 輸入處理
        this.mouse = { x: 0, y: 0, isDown: false };
        this.keys = {};
        
        // 性能監控
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // 特效管理
        this.effects = [];
        // this.shakeIntensity = 0;
        // this.shakeDecay = 0.9;
        
        // 音效和設置
        this.soundEnabled = true;
        this.effectsEnabled = true;
        
        // 遊戲統計
        this.gameStats = {
            startTime: Date.now(),
            totalShots: 0,
            totalHits: 0,
            accuracy: 0,
            highestCombo: 0,
            currentCombo: 0
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeGame();
        this.showLoading();
    }

    initializeGame() {
        // 初始化遊戲系統
        this.fishManager = new FishManager(this.canvas);
        this.cannon = new Cannon(this.canvas.width / 2, this.canvas.height - 80);
        this.bullets = [];
        this.particles = [];
        this.effects = [];
        
        // 連續電擊系統
        this.autoLightningTimer = 0;
        this.lightningTargets = [];
        this.activeChainCount = 0;
        this.continuousTargets = new Map(); // 存儲正在被連續電擊的目標
        this.activeLightningEffects = new Set(); // 追蹤活躍的閃電效果
        
        // 重置遊戲數據
        this.score = GAME_CONFIG.INITIAL_SCORE || 10000;
        this.coins = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.INITIAL_COINS : 1000;
        this.currentBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.DEFAULT_BET : 5;
        this.totalBetAmount = 0;
        this.totalWinAmount = 0;
        this.gameStats = {
            startTime: Date.now(),
            totalShots: 0,
            totalHits: 0,
            accuracy: 0,
            highestCombo: 0,
            currentCombo: 0
        };
        
        // 設置閃電攻擊事件監聽器
        if (GAME_CONFIG.AUTO_LIGHTNING_MODE) {
            this.setupLightningEventListeners();
        }
        
        this.updateUI();
    }

    setupEventListeners() {
        // 滑鼠事件
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // 觸控事件（移動設備）
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // 鍵盤事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // UI按鈕事件
        document.getElementById('cannonUpgrade').addEventListener('click', () => this.upgradeCannon());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        // 防止右鍵菜單
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // 新增：設置閃電攻擊事件監聽器
    setupLightningEventListeners() {
        document.addEventListener('lightningFired', (e) => {
            this.handleLightningAttack(e.detail);
        });
    }

    showLoading() {
        this.gameState = 'loading';
        let progress = 0;
        
        const loadingInterval = setInterval(() => {
            progress += 2;
            document.getElementById('progress').style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    document.getElementById('loading').classList.add('hidden');
                    
                    // 確保賭注面板可見
                    const betPanel = document.getElementById('betPanel');
                    if (betPanel) {
                        betPanel.style.display = 'block';
                        betPanel.style.visibility = 'visible';
                        betPanel.style.opacity = '1';
                        console.log('載入完成後設置賭注面板可見');
                    }
                    
                    this.startGame();
                }, 500);
            }
        }, 50);
    }

    startGame() {
        this.gameState = 'playing';
        this.isRunning = true;
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 更新FPS
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / (this.deltaTime || 16));
        }
        
        // 如果幀率太低，跳過某些更新以保持流暢度
        const isLowFrameRate = this.deltaTime > 33; // 低於30FPS
        
        if (!this.isPaused && this.gameState === 'playing') {
            this.update(isLowFrameRate);
        }
        
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(isLowFrameRate = false) {
        // 更新炮台
        this.cannon.update();
        
        // 更新魚類管理器
        this.fishManager.update();
        
        // 自動閃電攻擊系統
        if (GAME_CONFIG.AUTO_LIGHTNING_MODE) {
            this.updateAutoLightning();
        }
        
        // 更新子彈
        this.updateBullets();
        
        // 在低幀率時跳過粒子和特效更新
        if (!isLowFrameRate) {
            // 更新粒子效果
            this.updateParticles();
            
            // 更新特效
            this.updateEffects();
        } else {
            // 低幀率時，清理部分粒子和特效
            if (this.particles.length > 20) {
                this.particles = this.particles.slice(-10);
            }
            if (this.effects.length > 10) {
                this.effects = this.effects.slice(-5);
            }
        }
        
        // 碰撞檢測
        this.handleCollisions();
        
        // 更新螢幕震動
        // this.updateScreenShake();
        
        // 檢查遊戲結束條件
        this.checkGameOver();
        
        // 更新UI
        this.updateUI();
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            
            // 處理分裂子彈
            if (bullet.canSplit && !bullet.hasSplit && bullet.life < bullet.maxLife * 0.5) {
                const splitBullets = bullet.createSplitBullets();
                if (splitBullets) {
                    this.bullets.push(...splitBullets);
                }
            }
            
            // 移除過期的子彈
            if (bullet.shouldBeRemoved()) {
                this.bullets.splice(i, 1);
            }
        }
    }

    updateParticles() {
        // 限制粒子數量，避免性能問題
        if (this.particles.length > 100) {
            this.particles = this.particles.slice(-50); // 只保留最新的50個粒子
        }
        
        Utils.updateParticles(this.particles);
    }

    updateEffects() {
        // 限制特效數量
        if (this.effects.length > 50) {
            this.effects = this.effects.slice(-25); // 只保留最新的25個特效
        }
        
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update();
            
            if (effect.shouldRemove) {
                this.effects.splice(i, 1);
            }
        }
    }

    handleCollisions() {
        const collisions = this.fishManager.checkBulletCollisions(this.bullets);
        
        collisions.forEach(({ bullet, fish }) => {
            const damage = bullet.getDamage();
            const hitResult = this.fishManager.hitFish(fish, damage);
            
            if (hitResult.score > 0) {
                this.addScore(hitResult.score);
                this.gameStats.totalHits++;
                this.gameStats.currentCombo++;
                
                if (this.gameStats.currentCombo > this.gameStats.highestCombo) {
                    this.gameStats.highestCombo = this.gameStats.currentCombo;
                }
                
                // 如果魚類死亡，給予金幣獎勵
                if (hitResult.killed && hitResult.coins > 0) {
                    this.coins += hitResult.coins;
                    this.showCoinReward(fish.x, fish.y, hitResult.coins);
                }
                
                // 連擊獎勵
                if (this.gameStats.currentCombo > 5) {
                    const comboBonus = Math.floor(this.gameStats.currentCombo / 5) * 10;
                    this.addScore(comboBonus);
                    this.showComboEffect(fish.x, fish.y, this.gameStats.currentCombo);
                }
                
                // 創建粒子效果
                const hitParticles = Utils.createParticles(fish.x, fish.y, 10, fish.color);
                this.particles.push(...hitParticles);
                
                // 螢幕震動
                // this.addScreenShake(5);
                
                // *** 範圍傷害系統 ***
                this.handleAreaDamage(bullet, fish, damage);
                
                // *** 新增：觸發連鎖反應 ***
                if (hitResult.killed) {
                    this.triggerChainReaction(fish, damage);
                }
                
            } else {
                // 未能擊殺，重置連擊
                this.gameStats.currentCombo = 0;
            }
        });
    }

    // 新增：處理範圍傷害
    handleAreaDamage(bullet, primaryTarget, primaryDamage) {
        // 根據炮台等級決定範圍傷害半徑 - 大幅增加範圍
        const aoeDamageRadius = 80 + bullet.cannonLevel * 25; // 基礎80像素，每級+25像素
        const aoeDamageMultiplier = 0.7 + bullet.cannonLevel * 0.15; // 範圍傷害為主傷害的70%起，每級+15%
        
        // 獲取範圍內的魚類
        const nearbyFishes = this.fishManager.getFishesInRange(
            primaryTarget.x, 
            primaryTarget.y, 
            aoeDamageRadius
        );
        
        // 對範圍內的其他魚類造成傷害
        let totalAoeScore = 0;
        let totalAoeCoins = 0;
        let aoeKillCount = 0;
        
        nearbyFishes.forEach(fish => {
            // 跳過主要目標（已經處理過了）
            if (fish === primaryTarget) return;
            
            // 計算距離衰減
            const distance = Utils.getDistance(primaryTarget.x, primaryTarget.y, fish.x, fish.y);
            const distanceRatio = 1 - (distance / aoeDamageRadius); // 距離越近傷害越高
            const aoeDamage = Math.max(1, Math.floor(primaryDamage * aoeDamageMultiplier * distanceRatio));
            
            // 對魚類造成範圍傷害
            const aoeResult = this.fishManager.hitFish(fish, aoeDamage);
            
            if (aoeResult.score > 0) {
                totalAoeScore += aoeResult.score;
                this.gameStats.totalHits++;
                
                // 如果魚類死亡，給予金幣獎勵
                if (aoeResult.killed && aoeResult.coins > 0) {
                    totalAoeCoins += aoeResult.coins;
                    aoeKillCount++;
                    this.showCoinReward(fish.x, fish.y, aoeResult.coins);
                }
                
                // 創建範圍傷害粒子效果
                const aoeParticles = Utils.createParticles(fish.x, fish.y, 5, '#FFD700');
                this.particles.push(...aoeParticles);
                
                // 顯示範圍傷害數字
                this.showAreaDamage(fish.x, fish.y, aoeDamage);
            }
        });
        
        // 添加範圍傷害的分數和金幣
        if (totalAoeScore > 0) {
            this.addScore(totalAoeScore);
            this.coins += totalAoeCoins;
        }
        
        // 創建範圍傷害視覺效果
        if (nearbyFishes.length > 1) { // 至少影響到1個其他魚類
            this.createAreaDamageEffect(primaryTarget.x, primaryTarget.y, aoeDamageRadius);
            
            // 根據影響的魚類數量增加震動
            // this.addScreenShake(Math.min(nearbyFishes.length * 2, 15));
        }
    }

    // 新增：顯示範圍傷害數字
    showAreaDamage(x, y, damage) {
        const damageEffect = {
            x: x + Utils.random(-10, 10),
            y: y + Utils.random(-10, 10),
            damage: damage,
            life: 1,
            decay: 0.02,
            vx: Utils.random(-1, 1),
            vy: -2,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.x += this.vx;
                this.y += this.vy;
                this.vy *= 0.98; // 減速
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = '#FFD700'; // 金色表示範圍傷害
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 2;
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const text = `-${damage}`;
                ctx.strokeText(text, this.x, this.y);
                ctx.fillText(text, this.x, this.y);
                
                ctx.restore();
            }
        };
        
        this.effects.push(damageEffect);
    }

    // 新增：創建範圍傷害視覺效果
    createAreaDamageEffect(x, y, radius) {
        const aoeEffect = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: radius,
            life: 1,
            decay: 0.05,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.radius = this.maxRadius * (1 - this.life);
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life * 0.3;
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // 內圈效果
                ctx.globalAlpha = this.life * 0.1;
                ctx.fillStyle = '#FFD700';
                ctx.fill();
                
                ctx.restore();
            }
        };
        
        this.effects.push(aoeEffect);
    }

    // 新增：處理雷電範圍傷害
    handleLightningAreaDamage(primaryTarget, primaryDamage) {
        // 雷電範圍傷害比普通子彈更大更強 - 大幅增加範圍
        const lightningRadius = 120 + this.cannon.level * 30; // 基礎120像素，每級+30像素
        const lightningDamageMultiplier = 0.8 + this.cannon.level * 0.2; // 範圍傷害為主傷害的80%起，每級+20%
        
        // 獲取範圍內的魚類
        const nearbyFishes = this.fishManager.getFishesInRange(
            primaryTarget.x, 
            primaryTarget.y, 
            lightningRadius
        );
        
        // 對範圍內的其他魚類造成雷電傷害
        let totalLightningScore = 0;
        let totalLightningCoins = 0;
        let lightningKillCount = 0;
        
        nearbyFishes.forEach(fish => {
            // 跳過主要目標（已經處理過了）
            if (fish === primaryTarget) return;
            
            // 計算距離衰減
            const distance = Utils.getDistance(primaryTarget.x, primaryTarget.y, fish.x, fish.y);
            const distanceRatio = Math.max(0.3, 1 - (distance / lightningRadius)); // 最低30%傷害
            const lightningDamage = Math.max(1, Math.floor(primaryDamage * lightningDamageMultiplier * distanceRatio));
            
            // 對魚類造成雷電範圍傷害
            const lightningResult = this.fishManager.hitFish(fish, lightningDamage);
            
            if (lightningResult.score > 0) {
                totalLightningScore += lightningResult.score;
                this.gameStats.totalHits++;
                
                // 如果魚類死亡，給予金幣獎勵
                if (lightningResult.killed && lightningResult.coins > 0) {
                    totalLightningCoins += lightningResult.coins;
                    lightningKillCount++;
                    this.showCoinReward(fish.x, fish.y, lightningResult.coins);
                }
                
                // 創建雷電傷害粒子效果
                const lightningParticles = Utils.createParticles(fish.x, fish.y, 8, '#87CEEB');
                this.particles.push(...lightningParticles);
                
                // 顯示雷電範圍傷害數字
                this.showLightningAreaDamage(fish.x, fish.y, lightningDamage);
                
                // 創建小型雷電效果
                this.createMiniLightningEffect(fish.x, fish.y);
            }
        });
        
        // 添加雷電範圍傷害的分數和金幣
        if (totalLightningScore > 0) {
            this.addScore(totalLightningScore);
            this.coins += totalLightningCoins;
            this.totalWinAmount += totalLightningCoins;
        }
        
        // 創建雷電範圍傷害視覺效果
        if (nearbyFishes.length > 1) { // 至少影響到1個其他魚類
            this.createLightningAreaEffect(primaryTarget.x, primaryTarget.y, lightningRadius);
            
            // 根據影響的魚類數量增加震動
            // this.addScreenShake(Math.min(nearbyFishes.length * 3, 20));
        }
    }

    // 新增：顯示雷電範圍傷害數字
    showLightningAreaDamage(x, y, damage) {
        const damageEffect = {
            x: x + Utils.random(-15, 15),
            y: y + Utils.random(-15, 15),
            damage: damage,
            life: 1,
            decay: 0.02,
            vx: Utils.random(-1.5, 1.5),
            vy: -2.5,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.x += this.vx;
                this.y += this.vy;
                this.vy *= 0.98; // 減速
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = '#87CEEB'; // 淺藍色表示雷電範圍傷害
                ctx.strokeStyle = '#00BFFF';
                ctx.lineWidth = 2;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const text = `⚡${damage}`;
                ctx.strokeText(text, this.x, this.y);
                ctx.fillText(text, this.x, this.y);
                
                ctx.restore();
            }
        };
        
        this.effects.push(damageEffect);
    }

    // 新增：創建雷電範圍效果
    createLightningAreaEffect(x, y, radius) {
        const lightningAreaEffect = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: radius,
            life: 1,
            decay: 0.04,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.radius = this.maxRadius * (1 - this.life);
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                
                // 外圈雷電效果
                ctx.globalAlpha = this.life * 0.4;
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // 內圈閃電效果
                ctx.globalAlpha = this.life * 0.2;
                ctx.fillStyle = '#87CEEB';
                ctx.fill();
                
                // 雷電閃爍效果
                if (Math.random() < 0.3) {
                    ctx.globalAlpha = this.life * 0.6;
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    
                    // 繪製隨機雷電線條
                    for (let i = 0; i < 5; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const startRadius = this.radius * 0.3;
                        const endRadius = this.radius * 0.9;
                        
                        const startX = this.x + Math.cos(angle) * startRadius;
                        const startY = this.y + Math.sin(angle) * startRadius;
                        const endX = this.x + Math.cos(angle) * endRadius;
                        const endY = this.y + Math.sin(angle) * endRadius;
                        
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
        };
        
        this.effects.push(lightningAreaEffect);
    }

    // 新增：創建小型雷電效果
    createMiniLightningEffect(x, y) {
        const miniLightning = {
            x: x,
            y: y,
            life: 1,
            decay: 0.08,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                if (Math.random() < 0.5) return; // 閃爍效果
                
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                
                // 繪製小型雷電
                ctx.beginPath();
                ctx.moveTo(this.x - 10, this.y - 10);
                ctx.lineTo(this.x + 5, this.y);
                ctx.lineTo(this.x - 5, this.y + 5);
                ctx.lineTo(this.x + 10, this.y + 10);
                ctx.stroke();
                
                ctx.restore();
            }
        };
        
        this.effects.push(miniLightning);
    }

    // 新增：觸發連鎖反應的方法
    triggerChainReaction(originFish, originalDamage) {
        // 檢查是否有太多連鎖正在進行，避免性能問題
        if (this.activeChainCount > 5) return;
        
        // 根據炮台等級決定是否觸發連鎖 - 降低觸發率減少卡頓
        const chainChance = Math.min(0.2 + this.cannon.level * 0.15, 0.7); // 20%起始，每級+15%，最高70%
        
        if (Math.random() > chainChance) return; // 機率觸發
        
        this.activeChainCount = (this.activeChainCount || 0) + 1;
        
        // 延遲觸發連鎖，讓主要擊殺動畫先播放
        setTimeout(() => {
            const chainTargets = originFish.triggerChainReaction(
                originalDamage, 
                0, 
                [], 
                this.fishManager.fishes
            );
            
            // 處理連鎖目標
            let totalChainScore = 0;
            chainTargets.forEach(({ fish, damage, chainCount }) => {
                const chainScore = fish.score * Math.pow(0.5, chainCount); // 連鎖分數遞減
                totalChainScore += chainScore;
                
                // 顯示連鎖分數
                setTimeout(() => {
                    Utils.createScoreFloat(fish.x, fish.y, Math.floor(chainScore));
                    this.showChainEffect(fish.x, fish.y, chainCount + 1);
                }, chainCount * 100);
            });
            
            if (totalChainScore > 0) {
                this.addScore(Math.floor(totalChainScore));
                this.gameStats.totalHits += chainTargets.length;
                
                // 連鎖獎勵額外震動
                // this.addScreenShake(chainTargets.length * 2);
                
                // 高級連鎖時觸發全螢幕閃電效果
                if (chainTargets.length >= 8) {
                    this.createScreenLightning();
                }
                
                // 播放連鎖音效
                Utils.playSound('chainReaction');
            }
            
            // 連鎖完成，減少活躍計數
            setTimeout(() => {
                this.activeChainCount = Math.max(0, (this.activeChainCount || 0) - 1);
            }, 1000);
        }, 200);
    }

    // 新增：顯示連鎖效果
    showChainEffect(x, y, chainLevel) {
        const effect = {
            x: x,
            y: y,
            chainLevel: chainLevel,
            life: 1,
            decay: 0.03,
            scale: 0,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.scale = Math.sin(this.life * Math.PI) * (1 + this.chainLevel * 0.3);
                this.y -= 0.5;
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                ctx.globalAlpha = this.life;
                
                // 連鎖等級顏色 - 更多顏色層次
                const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF6600', '#FF0066', '#00FF00', '#FFFFFF', '#FFD700'];
                ctx.fillStyle = colors[Math.min(this.chainLevel - 1, colors.length - 1)] || '#00FFFF';
                
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // 繪製連鎖標識
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(`⚡x${this.chainLevel}`, 0, 0);
                ctx.fillText(`⚡x${this.chainLevel}`, 0, 0);
                
                ctx.restore();
            }
        };
        
        this.effects.push(effect);
    }

    // 新增：更新自動閃電攻擊
    updateAutoLightning() {
        this.autoLightningTimer++;
        
        if (GAME_CONFIG.CONTINUOUS_LIGHTNING) {
            // 連續電擊模式
            this.updateContinuousLightning();
        } else {
            // 原始間隔攻擊模式
            if (this.autoLightningTimer >= GAME_CONFIG.LIGHTNING_FIRE_RATE) {
                this.autoLightningTimer = 0;
                this.executeAutoLightningAttack();
            }
        }
    }

    // 新增：連續電擊更新邏輯
    updateContinuousLightning() {
        // 每隔幾幀執行一次連續電擊
        if (this.autoLightningTimer >= GAME_CONFIG.LIGHTNING_FIRE_RATE) {
            this.autoLightningTimer = 0;
            this.executeContinuousLightning();
        }
        
        // 更新正在進行的連續電擊
        this.updateActiveContinuousTargets();
    }

    // 新增：執行連續電擊
    executeContinuousLightning() {
        // 檢查是否有足夠金幣進行攻擊
        if (this.coins < this.currentBet) {
            // 金幣不足，清除所有連續電擊目標
            this.continuousTargets.forEach((lightningData, targetId) => {
                if (lightningData.indicator) {
                    Utils.removeElement(lightningData.indicator);
                }
            });
            this.continuousTargets.clear();
            return;
        }
        
        const fishes = this.fishManager.fishes.filter(fish => !fish.isDead);
        if (fishes.length === 0) return;
        
        // 鎖定目標模式：只有在沒有目標或當前目標死亡時才選擇新目標
        if (GAME_CONFIG.LOCK_TARGET_UNTIL_DEAD) {
            // 如果沒有任何目標，選擇一個新目標
            if (this.continuousTargets.size === 0) {
                // 優先選擇高分魚類
                const target = fishes.sort((a, b) => b.score - a.score)[0];
                this.startContinuousLightning(target);
            }
        } else {
            // 原來的邏輯：可以同時攻擊多個目標
            if (this.continuousTargets.size < GAME_CONFIG.MAX_CONTINUOUS_TARGETS) {
                const availableFishes = fishes.filter(fish => !this.continuousTargets.has(fish.id));
                
                if (availableFishes.length > 0) {
                    const target = availableFishes.sort((a, b) => b.score - a.score)[0];
                    this.startContinuousLightning(target);
                }
            }
        }
    }

    // 新增：開始對目標進行連續電擊
    startContinuousLightning(target) {
        if (this.continuousTargets.has(target.id)) return;
        
        const lightningData = {
            target: target,
            startTime: Date.now(),
            lastStrike: 0,
            strikeCount: 0,
            indicator: null
        };
        
        // 創建目標指示器
        lightningData.indicator = this.createTargetIndicator(target);
        
        this.continuousTargets.set(target.id, lightningData);
        console.log(`開始連續電擊目標: ${target.type} (ID: ${target.id})`);
    }

    // 新增：創建目標指示器
    createTargetIndicator(target) {
        const indicator = Utils.createElement('div', 'continuous-target-indicator');
        indicator.style.left = (target.x - 20) + 'px';
        indicator.style.top = (target.y - 20) + 'px';
        document.getElementById('gameArea').appendChild(indicator);
        return indicator;
    }

    // 新增：更新活躍的連續電擊目標
    updateActiveContinuousTargets() {
        const currentTime = Date.now();
        const toRemove = [];
        
        this.continuousTargets.forEach((lightningData, targetId) => {
            const target = lightningData.target;
            
            // 如果目標已死亡，停止電擊
            if (target.isDead) {
                toRemove.push(targetId);
                return;
            }
            
            // 更新指示器位置
            if (lightningData.indicator) {
                lightningData.indicator.style.left = (target.x - 20) + 'px';
                lightningData.indicator.style.top = (target.y - 20) + 'px';
            }
            
            // 檢查是否應該發出下一次電擊 - 更頻繁的電擊
            if (currentTime - lightningData.lastStrike >= GAME_CONFIG.LIGHTNING_DURATION) {
                this.strikeContinuousTarget(lightningData);
                lightningData.lastStrike = currentTime;
                lightningData.strikeCount++;
            }
            
            // 如果電擊持續太久，停止電擊（防止無限電擊）
            if (currentTime - lightningData.startTime > 10000) { // 10秒後停止
                toRemove.push(targetId);
            }
        });
        
        // 移除已完成的電擊目標
        toRemove.forEach(targetId => {
            const lightningData = this.continuousTargets.get(targetId);
            if (lightningData && lightningData.indicator) {
                Utils.removeElement(lightningData.indicator);
            }
            this.continuousTargets.delete(targetId);
        });
    }

    // 新增：對連續電擊目標發出電擊
    strikeContinuousTarget(lightningData) {
        const target = lightningData.target;
        const cannonX = this.cannon.x;
        const cannonY = this.cannon.y;
        
        // 檢查是否有足夠金幣進行攻擊
        if (this.coins < this.currentBet) {
            // 金幣不足，停止攻擊
            this.showInsufficientCoins();
            return;
        }
        
        // 消耗賭注（金幣）
        this.coins -= this.currentBet;
        this.totalBetAmount += this.currentBet;
        
        // 創建連續閃電效果
        const lightningEffect = Utils.createChainLightning(cannonX, cannonY, target.x, target.y, 0.8, 0, true);
        this.activeLightningEffects.add(lightningEffect);
        
        // 延遲移除效果引用
        setTimeout(() => {
            this.activeLightningEffects.delete(lightningEffect);
        }, GAME_CONFIG.LIGHTNING_DURATION);
        
        // 造成持續傷害 - 使用賭注的一部分作為傷害值
        setTimeout(() => {
            if (!target.isDead) {
                const damage = Math.max(1, Math.floor(this.currentBet * 0.5)); // 賭注的50%作為傷害值
                const hitResult = this.fishManager.hitFish(target, damage);
                
                if (hitResult.score > 0) {
                    this.addScore(hitResult.score);
                    this.gameStats.totalHits++;
                    this.gameStats.currentCombo++;
                    
                    // 如果魚類死亡，給予金幣獎勵
                    if (hitResult.killed && hitResult.coins > 0) {
                        this.coins += hitResult.coins;
                        this.totalWinAmount += hitResult.coins;
                        this.showCoinReward(target.x, target.y - 20, hitResult.coins);
                    }
                    
                    // *** 雷電範圍傷害效果 ***
                    this.handleLightningAreaDamage(target, damage);
                    
                    // 創建持續電擊粒子效果
                    const hitParticles = Utils.createParticles(target.x, target.y, 8, '#00FFFF');
                    this.particles.push(...hitParticles);
                    
                    // 顯示電擊傷害數字
                    this.showLightningDamage(target.x, target.y, Math.floor(damage));
                    
                    // 增強震動效果
                    // this.addScreenShake(6);
                    
                    // 如果目標死亡，立即停止對其電擊並清理指示器
                    if (target.isDead) {
                        const lightningData = this.continuousTargets.get(target.id);
                        if (lightningData && lightningData.indicator) {
                            Utils.removeElement(lightningData.indicator);
                        }
                        this.continuousTargets.delete(target.id);
                    }
                }
            }
        }, 10); // 極短延遲讓電擊幾乎即時
    }

    // 新增：執行自動閃電攻擊
    executeAutoLightningAttack() {
        const fishes = this.fishManager.fishes;
        if (fishes.length === 0) return;
        
        // 選擇多個目標
        const targets = this.selectLightningTargets(fishes, GAME_CONFIG.LIGHTNING_TARGET_COUNT);
        
        targets.forEach((target, index) => {
            setTimeout(() => {
                this.fireLightningAtTarget(target);
            }, index * 100); // 錯開攻擊時間
        });
    }

    // 新增：選擇閃電攻擊目標
    selectLightningTargets(fishes, count) {
        // 優先攻擊高分魚類
        const sortedFishes = fishes.filter(fish => !fish.isDead)
            .sort((a, b) => b.score - a.score);
        
        return sortedFishes.slice(0, count);
    }

    // 新增：對目標發射閃電
    fireLightningAtTarget(target) {
        if (target.isDead) return;
        
        const cannonX = this.cannon.x;
        const cannonY = this.cannon.y;
        
        // 創建直擊閃電
        Utils.createChainLightning(cannonX, cannonY, target.x, target.y, 1, 0);
        
        // 直接造成傷害
        setTimeout(() => {
            if (!target.isDead) {
                const damage = Math.max(1, this.cannon.power * 0.5); // 降低閃電傷害
                const hitResult = this.fishManager.hitFish(target, damage);
                
                if (hitResult.score > 0) {
                    this.addScore(hitResult.score);
                    this.gameStats.totalHits++;
                    this.gameStats.currentCombo++;
                    
                    // 如果魚類死亡，給予金幣獎勵
                    if (hitResult.killed && hitResult.coins > 0) {
                        this.coins += hitResult.coins;
                        this.showCoinReward(target.x, target.y, hitResult.coins);
                    }
                    
                    // *** 雷電範圍傷害效果 ***
                    this.handleLightningAreaDamage(target, damage);
                    
                    // 觸發連鎖反應
                    if (hitResult.killed) {
                        this.triggerChainReaction(target, damage);
                    }
                    
                    // 創建強化的雷電爆炸效果
                    const hitParticles = Utils.createParticles(target.x, target.y, 20, '#00FFFF');
                    this.particles.push(...hitParticles);
                    
                    // 顯示雷電傷害數字
                    this.showLightningDamage(target.x, target.y, Math.floor(damage));
                    
                    // 增強螢幕震動
                    // this.addScreenShake(12);
                }
            }
        }, 150); // 延遲造成傷害，讓閃電特效先顯示
    }

    // 新增：處理閃電攻擊事件
    handleLightningAttack(detail) {
        // 這個方法處理手動觸發的閃電攻擊
        const targetX = detail.targetX;
        const targetY = detail.targetY;
        
        // 找到最近的魚作為目標
        const closestFish = this.fishManager.getClosestFish(targetX, targetY);
        
        if (closestFish) {
            this.fireLightningAtTarget(closestFish);
        }
    }

    // 新增：創建全螢幕閃電效果
    createScreenLightning() {
        const lightning = Utils.createElement('div', 'screen-lightning');
        lightning.style.position = 'absolute';
        lightning.style.top = '0';
        lightning.style.left = '0';
        lightning.style.width = '100%';
        lightning.style.height = '100%';
        lightning.style.background = `
            linear-gradient(45deg, transparent 45%, rgba(0,255,255,0.3) 50%, transparent 55%),
            linear-gradient(-45deg, transparent 45%, rgba(255,255,255,0.2) 50%, transparent 55%),
            radial-gradient(circle at 50% 50%, rgba(0,255,255,0.1) 0%, transparent 70%)
        `;
        lightning.style.pointerEvents = 'none';
        lightning.style.zIndex = '90';
        lightning.style.mixBlendMode = 'screen';
        
        document.getElementById('gameArea').appendChild(lightning);
        
        // 閃爍效果
        let flashes = 0;
        const flashInterval = setInterval(() => {
            lightning.style.opacity = lightning.style.opacity === '0' ? '1' : '0';
            flashes++;
            if (flashes >= 6) {
                clearInterval(flashInterval);
                Utils.removeElement(lightning);
            }
        }, 50);
    }

    updateScreenShake() {
        // 視野晃動效果已停用
        // if (this.shakeIntensity > 0) {
        //     this.shakeIntensity *= this.shakeDecay;
        //     if (this.shakeIntensity < 0.1) {
        //         this.shakeIntensity = 0;
        //     }
        // }
    }

    checkGameOver() {
        if (this.score <= 0) {
            this.gameOver();
        }
    }

    render() {
        // 清除畫布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 儲存變換狀態
        this.ctx.save();
        
        // 應用螢幕震動 - 已停用
        // if (this.shakeIntensity > 0) {
        //     const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        //     const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        //     this.ctx.translate(shakeX, shakeY);
        // }
        
        // 繪製海洋背景
        this.drawOceanBackground();
        
        // 繪製魚類
        this.fishManager.draw(this.ctx);
        
        // 繪製子彈
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        // 繪製炮台
        this.cannon.draw(this.ctx);
        
        // 繪製粒子效果
        Utils.drawParticles(this.ctx, this.particles);
        
        // 繪製特效
        this.effects.forEach(effect => effect.draw(this.ctx));
        
        // 恢復變換狀態
        this.ctx.restore();
        
        // 繪製UI覆蓋層
        this.drawUIOverlay();
        
        // 繪製調試信息
        if (this.keys['KeyI']) {
            this.drawDebugInfo();
        }
    }

    drawOceanBackground() {
        // 海洋漸變背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#4682B4');
        gradient.addColorStop(0.7, '#1E90FF');
        gradient.addColorStop(1, '#191970');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 海底沙子
        const sandGradient = this.ctx.createLinearGradient(0, this.canvas.height - 50, 0, this.canvas.height);
        sandGradient.addColorStop(0, 'rgba(238, 203, 173, 0.3)');
        sandGradient.addColorStop(1, 'rgba(238, 203, 173, 0.8)');
        
        this.ctx.fillStyle = sandGradient;
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        
        // 水泡效果
        this.drawBubbles();
        
        // 海草和珊瑚
        this.drawSeaweedAndCoral();
    }

    drawBubbles() {
        const time = Date.now() * 0.001;
        for (let i = 0; i < 20; i++) {
            const x = (i * 50 + Math.sin(time + i) * 20) % this.canvas.width;
            const y = (this.canvas.height - i * 30 + Math.sin(time * 2 + i) * 10) % this.canvas.height;
            const size = 2 + Math.sin(time * 3 + i) * 2;
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    drawSeaweedAndCoral() {
        // 簡單的海草
        this.ctx.strokeStyle = '#228B22';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < 5; i++) {
            const x = i * (this.canvas.width / 5) + 50;
            const height = 60 + Math.random() * 40;
            const waveOffset = Date.now() * 0.001 + i;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.canvas.height);
            
            for (let j = 0; j < height; j += 5) {
                const waveX = x + Math.sin(waveOffset + j * 0.1) * (j * 0.1);
                const y = this.canvas.height - j;
                this.ctx.lineTo(waveX, y);
            }
            
            this.ctx.stroke();
        }
    }

    drawUIOverlay() {
        // 重載進度條
        if (this.cannon.isReloading) {
            const progress = this.cannon.getReloadProgress();
            const barWidth = 100;
            const barHeight = 8;
            const x = this.cannon.x - barWidth / 2;
            const y = this.cannon.y + 50;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(x, y, barWidth * progress, barHeight);
            
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, barWidth, barHeight);
        }
        
        // 炮管熱度指示器
        if (this.cannon.getHeatLevel() > 0) {
            const heatLevel = this.cannon.getHeatLevel();
            const barWidth = 80;
            const barHeight = 6;
            const x = this.cannon.x - barWidth / 2;
            const y = this.cannon.y + 65;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            const heatColor = heatLevel > 0.7 ? '#FF0000' : heatLevel > 0.4 ? '#FF8000' : '#FFFF00';
            this.ctx.fillStyle = heatColor;
            this.ctx.fillRect(x, y, barWidth * heatLevel, barHeight);
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 150);
        
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const stats = this.fishManager.getStats();
        const debugInfo = [
            `FPS: ${this.fps}`,
            `魚類數量: ${stats.aliveFishCount}`,
            `子彈數量: ${this.bullets.length}`,
            `粒子數量: ${this.particles.length}`,
            `難度等級: ${stats.difficultyLevel}`,
            `總生成魚: ${stats.totalFishSpawned}`,
            `總擊殺: ${stats.totalFishKilled}`,
            `準確率: ${this.gameStats.accuracy.toFixed(1)}%`,
            `最高連擊: ${this.gameStats.highestCombo}`,
            `當前連擊: ${this.gameStats.currentCombo}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 15, 25 + index * 15);
        });
    }

    // 事件處理
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        if (this.gameState === 'playing') {
            this.cannon.setTarget(this.mouse.x, this.mouse.y);
        }
    }

    handleMouseDown(e) {
        this.mouse.isDown = true;
    }

    handleMouseUp(e) {
        this.mouse.isDown = false;
    }

    handleClick(e) {
        if (this.gameState === 'playing' && !this.isPaused) {
            this.fire();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = touch.clientX - rect.left;
        this.mouse.y = touch.clientY - rect.top;
        this.mouse.isDown = true;
        
        if (this.gameState === 'playing' && !this.isPaused) {
            this.cannon.setTarget(this.mouse.x, this.mouse.y);
            this.fire();
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = touch.clientX - rect.left;
        this.mouse.y = touch.clientY - rect.top;
        
        if (this.gameState === 'playing') {
            this.cannon.setTarget(this.mouse.x, this.mouse.y);
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.mouse.isDown = false;
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (this.gameState === 'playing' && !this.isPaused) {
                    this.fire();
                }
                break;
            case 'KeyP':
                this.togglePause();
                break;
            case 'KeyR':
                if (this.gameState === 'gameOver') {
                    this.restart();
                }
                break;
            case 'KeyU':
                this.upgradeCannon();
                break;
            case 'KeyA':
                this.toggleAutoAim();
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    // 遊戲操作
    fire() {
        if (this.cannon.canFire() && this.score > 0) {
            const bullet = this.cannon.fire();
            if (bullet) {
                this.bullets.push(bullet);
                this.addScore(-this.cannon.cost);
                this.gameStats.totalShots++;
                
                // 自動瞄準最近的魚
                if (this.cannon.autoAim) {
                    const closestFish = this.fishManager.getClosestFish(this.cannon.x, this.cannon.y);
                    if (closestFish) {
                        bullet.setHomingTarget(closestFish);
                    }
                }
                
                // 更新準確率
                this.gameStats.accuracy = (this.gameStats.totalHits / this.gameStats.totalShots) * 100;
            }
        }
    }

    upgradeCannon() {
        if (this.cannon.canUpgrade(this.score)) {
            const cost = this.cannon.getUpgradeCost();
            if (this.cannon.upgrade()) {
                this.addScore(-cost);
                // this.addScreenShake(10);
            }
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? '繼續' : '暫停';
        }
    }

    toggleAutoAim() {
        if (this.cannon.autoAim) {
            this.cannon.disableAutoAim();
        } else {
            const closestFish = this.fishManager.getClosestFish(this.cannon.x, this.cannon.y);
            if (closestFish) {
                this.cannon.setAutoAim(closestFish);
            }
        }
    }

    addScore(points) {
        this.score += points;
        this.score = Math.max(0, this.score);
    }

    addScreenShake(intensity) {
        // this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    showComboEffect(x, y, combo) {
        const effect = {
            x: x,
            y: y,
            combo: combo,
            life: 1,
            decay: 0.02,
            scale: 0,
            shouldRemove: false,
            update() {
                this.life -= this.decay;
                this.scale = Math.sin(this.life * Math.PI) * 2;
                this.y -= 1;
                if (this.life <= 0) {
                    this.shouldRemove = true;
                }
            },
            draw(ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                ctx.globalAlpha = this.life;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`連擊 x${this.combo}!`, 0, 0);
                ctx.restore();
            }
        };
        
        this.effects.push(effect);
    }

    // 新增：顯示電擊傷害數字
    showLightningDamage(x, y, damage) {
        const damageText = Utils.createElement('div', 'lightning-damage');
        damageText.textContent = `-${damage}`;
        damageText.style.left = (x - 10) + 'px';
        damageText.style.top = (y - 10) + 'px';
        document.getElementById('gameArea').appendChild(damageText);
        
        setTimeout(() => {
            Utils.removeElement(damageText);
        }, 800);
    }

    // 新增：顯示金幣獎勵
    showCoinReward(x, y, coins) {
        const coinText = Utils.createElement('div', 'coin-reward');
        coinText.textContent = `+${coins}`;
        coinText.style.position = 'absolute';
        coinText.style.left = x + 'px';
        coinText.style.top = y + 'px';
        coinText.style.color = '#FFD700';
        coinText.style.fontWeight = 'bold';
        coinText.style.fontSize = '14px';
        coinText.style.pointerEvents = 'none';
        coinText.style.zIndex = '100';
        coinText.style.animation = 'coinFloat 1s ease-out forwards';
        
        document.getElementById('gameArea').appendChild(coinText);
        
        setTimeout(() => {
            Utils.removeElement(coinText);
        }, 1000);
    }

    // 新增：顯示金幣不足提示
    showInsufficientCoins() {
        const warning = Utils.createElement('div', 'insufficient-coins');
        warning.textContent = '金幣不足！';
        warning.style.position = 'absolute';
        warning.style.left = '50%';
        warning.style.top = '50%';
        warning.style.transform = 'translate(-50%, -50%)';
        warning.style.color = '#FF4444';
        warning.style.fontSize = '24px';
        warning.style.fontWeight = 'bold';
        warning.style.pointerEvents = 'none';
        warning.style.zIndex = '200';
        warning.style.animation = 'warningFlash 1s ease-out forwards';
        
        document.getElementById('gameArea').appendChild(warning);
        
        setTimeout(() => {
            Utils.removeElement(warning);
        }, 1000);
    }

    // 新增：設置賭注
    setBet(betAmount) {
        const minBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.MIN_BET : 1;
        const maxBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.MAX_BET : 100;
        
        if (betAmount >= minBet && betAmount <= maxBet) {
            this.currentBet = betAmount;
            this.updateUI();
        }
    }

    // 新增：增加賭注
    increaseBet() {
        const betOptions = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? 
            GAME_CONFIG.BET_SYSTEM.BET_OPTIONS : [1, 2, 5, 10, 20, 50, 100];
        
        const currentIndex = betOptions.indexOf(this.currentBet);
        if (currentIndex < betOptions.length - 1) {
            this.currentBet = betOptions[currentIndex + 1];
            this.updateUI();
        }
    }

    // 新增：減少賭注
    decreaseBet() {
        const betOptions = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? 
            GAME_CONFIG.BET_SYSTEM.BET_OPTIONS : [1, 2, 5, 10, 20, 50, 100];
        
        const currentIndex = betOptions.indexOf(this.currentBet);
        if (currentIndex > 0) {
            this.currentBet = betOptions[currentIndex - 1];
            this.updateUI();
        }
    }

    updateUI() {
        // 安全檢查DOM元素是否存在
        const scoreValue = document.getElementById('scoreValue');
        const cannonLevelValue = document.getElementById('cannonLevelValue');
        const coinsValue = document.getElementById('coinsValue');
        const betValue = document.getElementById('betValue');
        const damageValue = document.getElementById('damageValue');
        const decreaseBetBtn = document.getElementById('decreaseBet');
        const increaseBetBtn = document.getElementById('increaseBet');
        const attackStatus = document.getElementById('attackStatus');
        
        if (scoreValue) scoreValue.textContent = Utils.formatNumber(this.score);
        if (cannonLevelValue && this.cannon) cannonLevelValue.textContent = this.cannon.level + 1;
        
        // 更新賭注和金幣顯示
        if (coinsValue) coinsValue.textContent = Utils.formatNumber(this.coins);
        if (betValue) betValue.textContent = this.currentBet;
        if (damageValue) damageValue.textContent = this.currentBet;
        
        // 更新賭注按鈕狀態
        if (decreaseBetBtn && increaseBetBtn) {
            const minBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.MIN_BET : 1;
            const maxBet = (GAME_CONFIG && GAME_CONFIG.BET_SYSTEM) ? GAME_CONFIG.BET_SYSTEM.MAX_BET : 100;
            
            decreaseBetBtn.disabled = this.currentBet <= minBet;
            increaseBetBtn.disabled = this.currentBet >= maxBet;
        }
        
        // 檢查是否有足夠金幣進行下次攻擊
        if (attackStatus) {
            const canAttack = this.coins >= this.currentBet;
            attackStatus.textContent = canAttack ? '可攻擊' : '金幣不足';
            attackStatus.style.color = canAttack ? '#00FF00' : '#FF4444';
        }
        
        const upgradeBtn = document.getElementById('cannonUpgrade');
        if (this.cannon.canUpgrade(this.score)) {
            upgradeBtn.disabled = false;
            upgradeBtn.textContent = `升級炮台 (${Utils.formatNumber(this.cannon.getUpgradeCost())})`;
        } else {
            upgradeBtn.disabled = true;
            upgradeBtn.textContent = this.cannon.level >= GAME_CONFIG.CANNON_LEVELS.length - 1 ? '已滿級' : '金幣不足';
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.isPaused = false;
        
        document.getElementById('finalScore').textContent = Utils.formatNumber(this.score);
        document.getElementById('gameOver').classList.remove('hidden');
        
        Utils.playSound('gameOver');
    }

    restart() {
        document.getElementById('gameOver').classList.add('hidden');
        this.initializeGame();
        this.gameState = 'playing';
        this.isPaused = false;
        
        document.getElementById('pauseBtn').textContent = '暫停';
    }

    // 公開方法
    pause() {
        if (this.gameState === 'playing') {
            this.isPaused = true;
        }
    }

    resume() {
        if (this.gameState === 'playing') {
            this.isPaused = false;
        }
    }

    destroy() {
        this.isRunning = false;
        // 清理事件監聽器
        // 這裡可以添加更多清理邏輯
    }
} 