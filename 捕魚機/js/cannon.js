// 炮台類
class Cannon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.level = 0;
        this.levelData = GAME_CONFIG.CANNON_LEVELS[this.level];
        this.power = this.levelData.power;
        this.cost = this.levelData.cost;
        this.color = this.levelData.color;
        
        // 瞄準相關
        this.targetX = 0;
        this.targetY = 0;
        this.angle = 0;
        this.aimAngle = 0;
        this.aimSpeed = 0.1;
        
        // 發射相關
        this.lastFireTime = 0;
        this.fireRate = 500; // 毫秒
        this.isReloading = false;
        this.reloadTime = 0;
        
        // 動畫相關
        this.fireAnimation = 0;
        this.recoilAnimation = 0;
        this.glowIntensity = 0;
        
        // 瞄準線
        this.showAimLine = true;
        this.aimLineLength = 200;
        
        // 自動瞄準
        this.autoAim = false;
        this.autoAimTarget = null;
        
        // 特效
        this.muzzleFlash = 0;
        this.barrelHeat = 0;
        
        // 升級效果
        this.upgradeAnimation = 0;
        this.justUpgraded = false;
    }

    update() {
        const currentTime = Date.now();
        
        // 更新瞄準角度
        this.updateAiming();
        
        // 更新動畫
        this.updateAnimations();
        
        // 更新重載狀態
        if (this.isReloading) {
            this.reloadTime += 16; // 假設60fps
            if (this.reloadTime >= this.fireRate) {
                this.isReloading = false;
                this.reloadTime = 0;
            }
        }
        
        // 冷卻炮管熱度
        if (this.barrelHeat > 0) {
            this.barrelHeat -= 0.01;
        }
        
        // 自動瞄準邏輯
        if (this.autoAim && this.autoAimTarget) {
            this.updateAutoAim();
        }
        
        // 升級動畫
        if (this.justUpgraded) {
            this.upgradeAnimation += 0.05;
            if (this.upgradeAnimation >= 1) {
                this.justUpgraded = false;
                this.upgradeAnimation = 0;
            }
        }
    }

    updateAiming() {
        // 平滑瞄準
        const targetAngle = Utils.getAngle(this.x, this.y, this.targetX, this.targetY);
        const angleDiff = targetAngle - this.aimAngle;
        
        // 處理角度環繞
        let adjustedDiff = angleDiff;
        if (adjustedDiff > Math.PI) {
            adjustedDiff -= Math.PI * 2;
        } else if (adjustedDiff < -Math.PI) {
            adjustedDiff += Math.PI * 2;
        }
        
        this.aimAngle += adjustedDiff * this.aimSpeed;
        this.angle = this.aimAngle;
    }

    updateAnimations() {
        // 發射動畫
        if (this.fireAnimation > 0) {
            this.fireAnimation -= 0.1;
        }
        
        // 後坐力動畫
        if (this.recoilAnimation > 0) {
            this.recoilAnimation -= 0.05;
        }
        
        // 槍口閃光
        if (this.muzzleFlash > 0) {
            this.muzzleFlash -= 0.1;
        }
        
        // 發光效果
        this.glowIntensity = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    }

    updateAutoAim() {
        if (this.autoAimTarget && !this.autoAimTarget.isDead) {
            // 預測目標位置
            const predictTime = 30; // 幀數
            const predictedX = this.autoAimTarget.x + this.autoAimTarget.vx * predictTime;
            const predictedY = this.autoAimTarget.y + this.autoAimTarget.vy * predictTime;
            
            this.setTarget(predictedX, predictedY);
        } else {
            this.autoAimTarget = null;
            this.autoAim = false;
        }
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    canFire() {
        return !this.isReloading && Date.now() - this.lastFireTime >= this.fireRate;
    }

    fire() {
        if (!this.canFire()) {
            return null;
        }
        
        this.lastFireTime = Date.now();
        this.isReloading = true;
        this.reloadTime = 0;
        
        // 觸發動畫
        this.fireAnimation = 1;
        this.recoilAnimation = 1;
        this.muzzleFlash = 1;
        this.barrelHeat = Math.min(this.barrelHeat + 0.2, 1);
        
        if (GAME_CONFIG.AUTO_LIGHTNING_MODE) {
            // 閃電模式：發射閃電攻擊
            this.fireLightning();
            return null; // 不產生炮彈
        } else {
            // 傳統模式：發射炮彈
            const barrelLength = 60;
            const barrelX = this.x + Math.cos(this.angle) * barrelLength;
            const barrelY = this.y + Math.sin(this.angle) * barrelLength;
            
            const bullet = new Bullet(barrelX, barrelY, this.angle, this.power, this.level);
            
            // 特效
            Utils.createRipple(barrelX, barrelY);
            Utils.playSound('cannonFire');
            Utils.vibrate(50);
            
            return bullet;
        }
    }

    // 新增：發射閃電攻擊
    fireLightning() {
        // 創建閃電炮口特效
        this.createLightningMuzzleFlash();
        
        // 觸發閃電攻擊事件
        const event = new CustomEvent('lightningFired', {
            detail: {
                cannonX: this.x,
                cannonY: this.y,
                targetX: this.targetX,
                targetY: this.targetY,
                power: this.power,
                level: this.level
            }
        });
        document.dispatchEvent(event);
        
        // 閃電音效和震動
        Utils.playSound('lightning');
        Utils.vibrate(100);
    }

    // 新增：創建閃電炮口特效
    createLightningMuzzleFlash() {
        const barrelLength = 60;
        const barrelX = this.x + Math.cos(this.angle) * barrelLength;
        const barrelY = this.y + Math.sin(this.angle) * barrelLength;
        
        // 主閃光
        const flash = Utils.createElement('div', 'lightning-muzzle-flash');
        flash.style.position = 'absolute';
        flash.style.left = (barrelX - 40) + 'px';
        flash.style.top = (barrelY - 40) + 'px';
        flash.style.width = '80px';
        flash.style.height = '80px';
        flash.style.background = `radial-gradient(circle, #FFFFFF 0%, #00FFFF 30%, #87CEEB 60%, transparent 100%)`;
        flash.style.borderRadius = '50%';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '75';
        flash.style.filter = 'drop-shadow(0 0 30px #00FFFF) brightness(3)';
        flash.style.animation = 'lightningFlash 0.4s ease-out';
        
        document.getElementById('gameArea').appendChild(flash);
        
        setTimeout(() => {
            Utils.removeElement(flash);
        }, 400);
        
        // 創建電弧效果
        this.createElectricArc(barrelX, barrelY);
    }

    // 新增：創建電弧效果
    createElectricArc(centerX, centerY) {
        for (let i = 0; i < 8; i++) {
            const arc = Utils.createElement('div', 'electric-arc');
            const angle = (Math.PI * 2 / 8) * i;
            const length = Utils.random(30, 60);
            const endX = centerX + Math.cos(angle) * length;
            const endY = centerY + Math.sin(angle) * length;
            
            // 創建閃電弧線
            Utils.createChainLightning(centerX, centerY, endX, endY, 0.8, 0);
        }
    }

    upgrade() {
        if (this.level < GAME_CONFIG.CANNON_LEVELS.length - 1) {
            this.level++;
            this.levelData = GAME_CONFIG.CANNON_LEVELS[this.level];
            this.power = this.levelData.power;
            this.cost = this.levelData.cost;
            this.color = this.levelData.color;
            
            // 升級效果
            this.justUpgraded = true;
            this.upgradeAnimation = 0;
            
            // 提升性能
            this.fireRate = Math.max(200, this.fireRate - 50);
            this.aimSpeed = Math.min(0.2, this.aimSpeed + 0.02);
            
            Utils.playSound('upgrade');
            Utils.createExplosion(this.x, this.y);
            
            return true;
        }
        return false;
    }

    getUpgradeCost() {
        if (this.level < GAME_CONFIG.CANNON_LEVELS.length - 1) {
            return GAME_CONFIG.CANNON_LEVELS[this.level + 1].cost * 1000;
        }
        return 0;
    }

    canUpgrade(playerScore) {
        return this.level < GAME_CONFIG.CANNON_LEVELS.length - 1 && 
               playerScore >= this.getUpgradeCost();
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 繪製基座
        this.drawBase(ctx);
        
        // 繪製炮管
        this.drawBarrel(ctx);
        
        // 繪製瞄準線
        if (this.showAimLine) {
            this.drawAimLine(ctx);
        }
        
        // 繪製升級效果
        if (this.justUpgraded) {
            this.drawUpgradeEffect(ctx);
        }
        
        // 繪製連續電擊指示器
        if (GAME_CONFIG.CONTINUOUS_LIGHTNING) {
            this.drawContinuousLightningIndicator(ctx);
        }
        
        ctx.restore();
    }

    // 新增：繪製連續電擊指示器
    drawContinuousLightningIndicator(ctx) {
        const time = Date.now() * 0.005;
        
        // 電擊光環
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(time) * 0.3;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -time * 20;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // 電弧環繞效果
        for (let i = 0; i < 6; i++) {
            const angle = (time + i * Math.PI / 3) % (Math.PI * 2);
            const radius = 70;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(time * 2 + i) * 0.2;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // 中心電擊核心
        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(time * 3) * 0.2;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, '#00FFFF');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBase(ctx) {
        // 基座陰影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(2, 2, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // 基座主體
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, '#444');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // 基座邊框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        // 等級指示器
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((this.level + 1).toString(), 0, 0);
        
        // 發光效果
        if (this.glowIntensity > 0) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20 * this.glowIntensity;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawBarrel(ctx) {
        ctx.save();
        ctx.rotate(this.angle);
        
        // 後坐力效果
        if (this.recoilAnimation > 0) {
            ctx.translate(-this.recoilAnimation * 10, 0);
        }
        
        // 炮管陰影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, -8, 62, 16);
        
        // 炮管主體
        const barrelGradient = ctx.createLinearGradient(0, -8, 0, 8);
        barrelGradient.addColorStop(0, '#666');
        barrelGradient.addColorStop(0.5, this.color);
        barrelGradient.addColorStop(1, '#444');
        
        ctx.fillStyle = barrelGradient;
        ctx.fillRect(0, -8, 60, 16);
        
        // 炮管熱度效果
        if (this.barrelHeat > 0) {
            const heatGradient = ctx.createLinearGradient(0, -8, 0, 8);
            heatGradient.addColorStop(0, `rgba(255, 0, 0, ${this.barrelHeat * 0.3})`);
            heatGradient.addColorStop(0.5, `rgba(255, 100, 0, ${this.barrelHeat * 0.5})`);
            heatGradient.addColorStop(1, `rgba(255, 0, 0, ${this.barrelHeat * 0.3})`);
            
            ctx.fillStyle = heatGradient;
            ctx.fillRect(0, -8, 60, 16);
        }
        
        // 炮管裝飾
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        for (let i = 10; i < 60; i += 10) {
            ctx.beginPath();
            ctx.moveTo(i, -8);
            ctx.lineTo(i, 8);
            ctx.stroke();
        }
        
        // 炮口
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(60, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(60, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 槍口閃光
        if (this.muzzleFlash > 0) {
            const flashGradient = ctx.createRadialGradient(60, 0, 0, 60, 0, 30);
            flashGradient.addColorStop(0, `rgba(255, 255, 100, ${this.muzzleFlash})`);
            flashGradient.addColorStop(0.5, `rgba(255, 200, 0, ${this.muzzleFlash * 0.5})`);
            flashGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = flashGradient;
            ctx.beginPath();
            ctx.arc(60, 0, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawAimLine(ctx) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 0, 0.7)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const endX = Math.cos(this.angle) * this.aimLineLength;
        const endY = Math.sin(this.angle) * this.aimLineLength;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 瞄準點
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    drawUpgradeEffect(ctx) {
        const scale = 1 + this.upgradeAnimation * 0.5;
        const alpha = 1 - this.upgradeAnimation;
        
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        
        // 升級光環
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.8, this.color + '80');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // 星星效果
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + this.upgradeAnimation * Math.PI;
            const x = Math.cos(angle) * 40;
            const y = Math.sin(angle) * 40;
            
            ctx.fillStyle = '#FFD700';
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            this.drawStar(ctx, 5);
            ctx.restore();
        }
        
        ctx.restore();
    }

    drawStar(ctx, size) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            const innerAngle = ((i + 0.5) * Math.PI * 2) / 5 - Math.PI / 2;
            const innerX = Math.cos(innerAngle) * size * 0.5;
            const innerY = Math.sin(innerAngle) * size * 0.5;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
    }

    setAutoAim(target) {
        this.autoAim = true;
        this.autoAimTarget = target;
    }

    disableAutoAim() {
        this.autoAim = false;
        this.autoAimTarget = null;
    }

    toggleAimLine() {
        this.showAimLine = !this.showAimLine;
    }

    getReloadProgress() {
        if (!this.isReloading) return 1;
        return this.reloadTime / this.fireRate;
    }

    getHeatLevel() {
        return this.barrelHeat;
    }
} 