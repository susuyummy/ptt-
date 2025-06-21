// 魚類基礎類
class Fish {
    constructor(x, y, type) {
        this.id = Math.random().toString(36).substr(2, 9); // 唯一ID
        this.x = x;
        this.y = y;
        this.type = type;
        this.typeData = GAME_CONFIG.FISH_TYPES[type];
        this.radius = this.typeData.size;
        this.speed = this.typeData.speed;
        this.color = this.typeData.color;
        this.score = this.typeData.score;
        this.name = this.typeData.name;
        
        // 移動相關
        this.vx = Utils.random(-this.speed, this.speed);
        this.vy = Utils.random(-this.speed, this.speed);
        this.angle = Utils.getAngle(0, 0, this.vx, this.vy);
        
        // 動畫相關
        this.animationTime = 0;
        this.swimCycle = 0;
        this.isDead = false;
        this.deathAnimation = 0;
        
        // 移動模式
        this.movementType = Utils.randomInt(0, 2); // 0: 直線, 1: 曲線, 2: 圓形
        this.movementTimer = 0;
        this.centerX = x;
        this.centerY = y;
        this.orbitRadius = Utils.random(50, 100);
        this.orbitSpeed = Utils.random(0.01, 0.03);
        
        // 特殊效果
        this.glowIntensity = 0;
        this.glowDirection = 1;
        
        // 邊界檢查
        this.outOfBounds = false;
        this.timeOutOfBounds = 0;
        
        // 新增：生命值系統 - 增加生命值讓魚更耐打
        this.maxHealth = Math.max(this.score * 2, this.score + 10); // 大幅增加生命值
        this.health = this.maxHealth;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
    }

    update() {
        if (this.isDead) {
            this.updateDeathAnimation();
            return;
        }

        this.animationTime += 0.1;
        this.swimCycle = Math.sin(this.animationTime * 2) * 0.1;
        this.movementTimer += 0.016; // 假設60fps
        
        // 更新無敵時間
        if (this.isInvulnerable) {
            this.invulnerabilityTimer--;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
            }
        }

        // 更新發光效果
        this.glowIntensity += this.glowDirection * 0.02;
        if (this.glowIntensity >= 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0) {
            this.glowIntensity = 0;
            this.glowDirection = 1;
        }

        // 根據移動模式更新位置
        switch (this.movementType) {
            case 0:
                this.updateLinearMovement();
                break;
            case 1:
                this.updateCurvedMovement();
                break;
            case 2:
                this.updateCircularMovement();
                break;
        }

        // 更新角度
        this.angle = Utils.getAngle(0, 0, this.vx, this.vy);

        // 邊界檢查
        this.checkBounds();
    }

    updateLinearMovement() {
        this.x += this.vx;
        this.y += this.vy;
        
        // 偶爾改變方向
        if (Math.random() < 0.001) {
            this.vx += Utils.random(-0.2, 0.2);
            this.vy += Utils.random(-0.2, 0.2);
            this.vx = Utils.clamp(this.vx, -this.speed, this.speed);
            this.vy = Utils.clamp(this.vy, -this.speed, this.speed);
        }
    }

    updateCurvedMovement() {
        // 正弦波移動
        const baseX = this.centerX + this.movementTimer * this.speed * 50;
        const baseY = this.centerY + Math.sin(this.movementTimer * 2) * 100;
        
        this.vx = (baseX - this.x) * 0.02;
        this.vy = (baseY - this.y) * 0.02;
        
        this.x += this.vx;
        this.y += this.vy;
    }

    updateCircularMovement() {
        // 圓形軌道移動
        const targetX = this.centerX + Math.cos(this.movementTimer * this.orbitSpeed) * this.orbitRadius;
        const targetY = this.centerY + Math.sin(this.movementTimer * this.orbitSpeed) * this.orbitRadius;
        
        this.vx = (targetX - this.x) * 0.05;
        this.vy = (targetY - this.y) * 0.05;
        
        this.x += this.vx;
        this.y += this.vy;
    }

    checkBounds() {
        const margin = 50;
        const canvas = document.getElementById('gameCanvas');
        const bounds = {
            left: -margin,
            right: canvas.width + margin,
            top: -margin,
            bottom: canvas.height + margin
        };

        if (this.x < bounds.left || this.x > bounds.right || 
            this.y < bounds.top || this.y > bounds.bottom) {
            
            if (!this.outOfBounds) {
                this.outOfBounds = true;
                this.timeOutOfBounds = 0;
            }
            this.timeOutOfBounds++;
            
            // 如果超出邊界太久，調整方向
            if (this.timeOutOfBounds > 60) { // 1秒 (60fps)
                this.adjustDirection();
                this.timeOutOfBounds = 0;
            }
        } else {
            this.outOfBounds = false;
            this.timeOutOfBounds = 0;
        }
    }

    adjustDirection() {
        const canvas = document.getElementById('gameCanvas');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // 朝向畫面中心
        const angleToCenter = Utils.getAngle(this.x, this.y, centerX, centerY);
        this.vx = Math.cos(angleToCenter) * this.speed;
        this.vy = Math.sin(angleToCenter) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        
        if (this.isDead) {
            this.drawDeathAnimation(ctx);
        } else {
            this.drawAlive(ctx);
        }
        
        ctx.restore();
    }

    drawAlive(ctx) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // 受傷閃爍效果
        if (this.isInvulnerable && this.invulnerabilityTimer % 10 < 5) {
            ctx.globalAlpha = 0.5;
        }
        
        // 發光效果
        if (this.type >= 3) { // 金魚、鯊魚、鯨魚有發光效果
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.5, this.color + '80');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 2 * this.glowIntensity, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 魚身
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 魚尾
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, 0);
        ctx.lineTo(-this.radius * 1.5, -this.radius * 0.4);
        ctx.lineTo(-this.radius * 1.2, 0);
        ctx.lineTo(-this.radius * 1.5, this.radius * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // 魚鰭
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.2, -this.radius * 0.5, 
                   this.radius * 0.3, this.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.2, this.radius * 0.5, 
                   this.radius * 0.3, this.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.radius * 0.35, -this.radius * 0.2, this.radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // 鱗片紋理
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-this.radius * 0.3 + i * this.radius * 0.3, 0, 
                   this.radius * 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 游泳動畫
        if (this.swimCycle !== 0) {
            ctx.scale(1 + this.swimCycle * 0.1, 1);
        }
        
        // 生命值條（當生命值不滿時顯示）
        if (this.health < this.maxHealth && !this.isDead) {
            this.drawHealthBar(ctx);
        }
    }

    drawDeathAnimation(ctx) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + this.deathAnimation);
        ctx.globalAlpha = 1 - this.deathAnimation;
        
        // 死亡時的魚身
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // X標記
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.3, -this.radius * 0.3);
        ctx.lineTo(this.radius * 0.3, this.radius * 0.3);
        ctx.moveTo(this.radius * 0.3, -this.radius * 0.3);
        ctx.lineTo(-this.radius * 0.3, this.radius * 0.3);
        ctx.stroke();
    }

    // 繪製生命值條
    drawHealthBar(ctx) {
        const barWidth = this.radius * 1.5;
        const barHeight = 4;
        const x = -barWidth / 2;
        const y = -this.radius - 15;
        
        // 背景
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 生命值
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#00FF00' : 
                           healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // 邊框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    updateDeathAnimation() {
        this.deathAnimation += 0.05;
        this.y += 1; // 下沉效果
        
        if (this.deathAnimation >= 1) {
            this.shouldRemove = true;
        }
    }

    // 修改：受到傷害而不是直接死亡
    takeDamage(damage) {
        if (this.isDead || this.isInvulnerable) return { killed: false, particles: [] };
        
        this.health -= damage;
        
        if (this.health <= 0) {
            return this.die();
        } else {
            // 受傷但未死亡，進入短暫無敵狀態
            this.isInvulnerable = true;
            this.invulnerabilityTimer = 5; // 大幅縮短無敵時間到約0.08秒
            
            // 創建受傷效果
            const particles = Utils.createParticles(this.x, this.y, 3, this.color);
            return { killed: false, particles: particles };
        }
    }

    die() {
        if (!this.isDead) {
            this.isDead = true;
            
            // 簡化死亡特效，減少性能消耗
            Utils.createScoreFloat(this.x, this.y, this.score);
            
            // 減少粒子數量
            const particles = Utils.createParticles(this.x, this.y, 3, this.color);
            return { killed: true, particles: particles };
        }
        return { killed: false, particles: [] };
    }

    // 檢查是否被子彈擊中
    checkCollision(bullet) {
        return Utils.circleCollision(this, bullet);
    }

    // 獲取魚的價值（基於類型和大小）
    getValue() {
        return this.score;
    }

    // 特殊魚類的特殊行為
    specialBehavior() {
        switch (this.type) {
            case 4: // 鯊魚 - 快速游動
                if (Math.random() < 0.005) {
                    this.speed *= 2;
                    setTimeout(() => {
                        this.speed = this.typeData.speed;
                    }, 1000);
                }
                break;
            case 5: // 鯨魚 - 產生小魚
                if (Math.random() < 0.001) {
                    return this.spawnSmallFish();
                }
                break;
        }
        return null;
    }

    spawnSmallFish() {
        const smallFish = [];
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const distance = this.radius + 30;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            smallFish.push(new Fish(x, y, 0)); // 產生小魚
        }
        return smallFish;
    }

    // 觸發連鎖反應
    triggerChainReaction(damage, chainCount = 0, excludeIds = [], allFishes = []) {
        if (chainCount >= GAME_CONFIG.MAX_CHAIN_COUNT) return [];
        
        const chainTargets = [];
        const range = GAME_CONFIG.CHAIN_REACTION_RANGE * (1 - chainCount * 0.2); // 範圍遞減
        const chainDamage = damage * Math.pow(GAME_CONFIG.CHAIN_DAMAGE_DECAY, chainCount);
        
        if (chainDamage < 1) return []; // 傷害太低，停止連鎖
        
        // 找到範圍內的魚 - 減少連鎖目標數量
        const targets = Utils.findChainTargets(
            this.x, this.y, 
            allFishes, 
            range, 
            2, // 減少每次最多連鎖2條魚
            [...excludeIds, this.id]
        );
        
        targets.forEach(target => {
            // 創建閃電特效 - 傳遞連鎖等級
            Utils.createChainLightning(
                this.x, this.y, 
                target.x, target.y, 
                1 - chainCount * 0.1, // 減少強度衰減
                chainCount // 傳遞連鎖等級
            );
            
            // 延遲造成傷害，增加延遲時間避免卡頓
            setTimeout(() => {
                if (!target.isDead) {
                    const killed = this.dealChainDamage(target, chainDamage);
                    if (killed) {
                        chainTargets.push({
                            fish: target,
                            damage: chainDamage,
                            chainCount: chainCount + 1
                        });
                        
                        // 進一步延遲下一級連鎖，避免同時處理
                        setTimeout(() => {
                            const nextChain = target.triggerChainReaction(
                                chainDamage, 
                                chainCount + 1, 
                                [...excludeIds, this.id, target.id],
                                allFishes
                            );
                            chainTargets.push(...nextChain);
                        }, 50); // 額外延遲
                    }
                }
            }, 150 + chainCount * 50); // 增加延遲時間
        });
        
        return chainTargets;
    }

    // 造成連鎖傷害
    dealChainDamage(target, damage) {
        const result = target.takeDamage(damage);
        return result.killed;
    }
} 