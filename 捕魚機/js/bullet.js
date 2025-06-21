// 子彈類
class Bullet {
    constructor(x, y, angle, power, cannonLevel) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.power = power;
        this.cannonLevel = cannonLevel;
        
        // 速度和移動
        this.speed = 8 + cannonLevel;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        
        // 大小和外觀
        this.radius = 5 + cannonLevel * 2;
        this.color = GAME_CONFIG.CANNON_LEVELS[cannonLevel].color;
        
        // 生命週期
        this.life = 300; // 幀數
        this.maxLife = this.life;
        this.shouldRemove = false;
        
        // 特效
        this.trail = [];
        this.glowIntensity = 1;
        this.particles = [];
        
        // 爆炸相關
        this.exploded = false;
        this.explosionRadius = 0;
        this.maxExplosionRadius = 30 + cannonLevel * 10;
        this.explosionAnimation = 0;
        
        // 特殊效果
        this.hasSpecialEffect = cannonLevel >= 2;
        this.homingTarget = null;
        this.homingStrength = 0.02;
        
        // 穿透能力
        this.penetration = cannonLevel >= 3 ? 2 : 1;
        this.hitTargets = [];
        
        // 分裂子彈
        this.canSplit = cannonLevel >= 4;
        this.hasSplit = false;
        
        // 電光效果
        this.hasLightning = cannonLevel >= 5;
        this.lightningTargets = [];
    }

    update() {
        if (this.exploded) {
            this.updateExplosion();
            return;
        }

        // 更新位置
        this.updatePosition();
        
        // 更新軌跡
        this.updateTrail();
        
        // 更新粒子效果
        this.updateParticles();
        
        // 更新生命週期
        this.life--;
        if (this.life <= 0) {
            this.explode();
        }
        
        // 邊界檢查
        this.checkBounds();
        
        // 特殊效果更新
        if (this.hasSpecialEffect) {
            this.updateSpecialEffects();
        }
    }

    updatePosition() {
        // 尋的效果
        if (this.homingTarget && !this.homingTarget.isDead && this.cannonLevel >= 2) {
            const targetAngle = Utils.getAngle(this.x, this.y, this.homingTarget.x, this.homingTarget.y);
            const currentAngle = Math.atan2(this.vy, this.vx);
            
            let angleDiff = targetAngle - currentAngle;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            const newAngle = currentAngle + angleDiff * this.homingStrength;
            this.vx = Math.cos(newAngle) * this.speed;
            this.vy = Math.sin(newAngle) * this.speed;
        }
        
        this.x += this.vx;
        this.y += this.vy;
    }

    updateTrail() {
        // 添加軌跡點
        this.trail.unshift({ x: this.x, y: this.y });
        
        // 限制軌跡長度
        const maxTrailLength = 10 + this.cannonLevel * 2;
        if (this.trail.length > maxTrailLength) {
            this.trail.pop();
        }
    }

    updateParticles() {
        // 添加新粒子
        if (Math.random() < 0.3) {
            this.particles.push({
                x: this.x + Utils.random(-5, 5),
                y: this.y + Utils.random(-5, 5),
                vx: Utils.random(-1, 1),
                vy: Utils.random(-1, 1),
                life: 1,
                decay: 0.05,
                size: Utils.random(1, 3),
                color: this.color
            });
        }
        
        // 更新現有粒子
        Utils.updateParticles(this.particles);
    }

    updateExplosion() {
        this.explosionAnimation += 0.1;
        this.explosionRadius = this.maxExplosionRadius * Utils.easeInOut(this.explosionAnimation);
        
        if (this.explosionAnimation >= 1) {
            this.shouldRemove = true;
        }
    }

    updateSpecialEffects() {
        // 分裂子彈
        if (this.canSplit && !this.hasSplit && this.life < this.maxLife * 0.5) {
            this.createSplitBullets();
        }
        
        // 電光效果
        if (this.hasLightning) {
            this.updateLightningEffect();
        }
    }

    checkBounds() {
        const canvas = document.getElementById('gameCanvas');
        const margin = 50;
        
        if (this.x < -margin || this.x > canvas.width + margin ||
            this.y < -margin || this.y > canvas.height + margin) {
            this.explode();
        }
    }

    explode() {
        if (!this.exploded) {
            this.exploded = true;
            this.explosionAnimation = 0;
            this.explosionRadius = 0;
            
            // 創建爆炸粒子
            const explosionParticles = Utils.createParticles(this.x, this.y, 15, this.color);
            this.particles.push(...explosionParticles);
            
            // 特效
            Utils.createExplosion(this.x, this.y);
            Utils.playSound('bulletExplosion');
        }
    }

    draw(ctx) {
        if (this.exploded) {
            this.drawExplosion(ctx);
        } else {
            this.drawBullet(ctx);
        }
        
        // 繪製粒子
        Utils.drawParticles(ctx, this.particles);
    }

    drawBullet(ctx) {
        ctx.save();
        
        // 繪製軌跡
        this.drawTrail(ctx);
        
        // 繪製子彈主體
        ctx.translate(this.x, this.y);
        
        // 發光效果
        if (this.cannonLevel >= 1) {
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 3);
            glowGradient.addColorStop(0, this.color + '80');
            glowGradient.addColorStop(0.5, this.color + '40');
            glowGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 子彈核心
        const bulletGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        bulletGradient.addColorStop(0, '#ffffff');
        bulletGradient.addColorStop(0.3, this.color);
        bulletGradient.addColorStop(1, this.color + '80');
        
        ctx.fillStyle = bulletGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 子彈邊框
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 特殊效果
        if (this.hasSpecialEffect) {
            this.drawSpecialEffects(ctx);
        }
        
        ctx.restore();
    }

    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 0; i < this.trail.length - 1; i++) {
            const alpha = (this.trail.length - i) / this.trail.length;
            const width = (this.radius * alpha) * 0.5;
            
            ctx.strokeStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = width;
            
            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawExplosion(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 主爆炸效果
        const explosionGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.explosionRadius);
        explosionGradient.addColorStop(0, this.color + 'FF');
        explosionGradient.addColorStop(0.3, this.color + 'CC');
        explosionGradient.addColorStop(0.6, this.color + '66');
        explosionGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = explosionGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.explosionRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 爆炸環
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.explosionRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 火花效果
        const sparkCount = 8;
        for (let i = 0; i < sparkCount; i++) {
            const angle = (Math.PI * 2 / sparkCount) * i + this.explosionAnimation * Math.PI;
            const length = this.explosionRadius * 1.2;
            const endX = Math.cos(angle) * length;
            const endY = Math.sin(angle) * length;
            
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawSpecialEffects(ctx) {
        // 旋轉光環
        if (this.cannonLevel >= 2) {
            const time = Date.now() * 0.01;
            ctx.strokeStyle = this.color + '80';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(time + i * Math.PI / 3);
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 5 + i * 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
        
        // 電光效果
        if (this.hasLightning) {
            this.drawLightning(ctx);
        }
    }

    drawLightning(ctx) {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 10;
        
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i;
            const length = this.radius * 2;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            
            // 鋸齒狀閃電
            let currentX = 0;
            let currentY = 0;
            const steps = 5;
            
            for (let j = 0; j < steps; j++) {
                const progress = (j + 1) / steps;
                const targetX = Math.cos(angle) * length * progress;
                const targetY = Math.sin(angle) * length * progress;
                
                const offsetX = Utils.random(-5, 5);
                const offsetY = Utils.random(-5, 5);
                
                ctx.lineTo(targetX + offsetX, targetY + offsetY);
            }
            
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
    }

    updateLightningEffect() {
        // 更新電光目標
        this.lightningTargets = this.lightningTargets.filter(target => !target.isDead);
    }

    createSplitBullets() {
        if (this.hasSplit) return;
        
        this.hasSplit = true;
        const splitCount = 3;
        const splitBullets = [];
        
        for (let i = 0; i < splitCount; i++) {
            const angleOffset = (Math.PI / 4) * (i - 1); // -45°, 0°, 45°
            const newAngle = this.angle + angleOffset;
            
            const splitBullet = new Bullet(
                this.x, this.y, newAngle, 
                Math.max(1, this.power - 1), 
                Math.max(0, this.cannonLevel - 1)
            );
            
            splitBullet.radius = this.radius * 0.8;
            splitBullet.life = this.life * 0.6;
            splitBullet.canSplit = false; // 防止無限分裂
            
            splitBullets.push(splitBullet);
        }
        
        return splitBullets;
    }

    setHomingTarget(target) {
        this.homingTarget = target;
    }

    checkCollision(fish) {
        if (this.exploded) {
            // 爆炸範圍檢測
            const distance = Utils.getDistance(this.x, this.y, fish.x, fish.y);
            return distance <= this.explosionRadius + fish.radius;
        } else {
            // 直接碰撞檢測
            return Utils.circleCollision(this, fish);
        }
    }

    hit(fish) {
        // 檢查是否已經擊中過這條魚（穿透效果）
        if (this.hitTargets.includes(fish)) {
            return false;
        }
        
        this.hitTargets.push(fish);
        
        // 如果是電光子彈，添加到電光目標
        if (this.hasLightning) {
            this.lightningTargets.push(fish);
        }
        
        // 檢查是否用完穿透次數
        if (this.hitTargets.length >= this.penetration) {
            this.explode();
        }
        
        return true;
    }

    getDamage() {
        return this.power;
    }

    getExplosionDamage() {
        // 爆炸傷害隨距離遞減
        return Math.max(1, Math.floor(this.power * 0.7));
    }

    // 獲取所有可能受到電光傷害的目標
    getLightningTargets() {
        return this.lightningTargets;
    }

    // 檢查子彈是否應該被移除
    shouldBeRemoved() {
        return this.shouldRemove || (this.exploded && this.explosionAnimation >= 1);
    }
} 