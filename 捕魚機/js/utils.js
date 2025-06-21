// 遊戲工具函數
class Utils {
    // 計算兩點之間的距離
    static getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 計算兩點之間的角度
    static getAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    // 角度轉弧度
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    // 弧度轉角度
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    // 隨機數生成
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }

    // 隨機整數生成
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 圓形碰撞檢測
    static circleCollision(obj1, obj2) {
        const distance = this.getDistance(obj1.x, obj1.y, obj2.x, obj2.y);
        return distance < (obj1.radius + obj2.radius);
    }

    // 矩形碰撞檢測
    static rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 限制數值範圍
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // 線性插值
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // 緩動函數
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // 創建DOM元素
    static createElement(tag, className, parent) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (parent) parent.appendChild(element);
        return element;
    }

    // 移除DOM元素
    static removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    // 格式化數字（添加千分位逗號）
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // 創建粒子效果 - 性能優化版
    static createParticles(x, y, count, color) {
        // 限制粒子數量，減少性能消耗
        const maxParticles = Math.min(count, 3);
        const particles = [];
        for (let i = 0; i < maxParticles; i++) {
            particles.push({
                x: x,
                y: y,
                vx: this.random(-2, 2),
                vy: this.random(-2, 2),
                life: 1,
                decay: this.random(0.04, 0.08), // 更快消失
                color: color || '#FFD700',
                size: this.random(2, 4)
            });
        }
        return particles;
    }

    // 更新粒子效果
    static updateParticles(particles) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // 重力效果
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // 繪製粒子效果
    static drawParticles(ctx, particles) {
        particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    // 創建波紋效果
    static createRipple(x, y) {
        const ripple = this.createElement('div', 'ripple-effect');
        ripple.style.left = (x - 25) + 'px';
        ripple.style.top = (y - 25) + 'px';
        ripple.style.width = '50px';
        ripple.style.height = '50px';
        document.getElementById('gameArea').appendChild(ripple);
        
        setTimeout(() => {
            this.removeElement(ripple);
        }, 600);
    }

    // 創建爆炸效果
    static createExplosion(x, y) {
        const explosion = this.createElement('div', 'explosion-effect');
        explosion.style.left = (x - 50) + 'px';
        explosion.style.top = (y - 50) + 'px';
        document.getElementById('gameArea').appendChild(explosion);
        
        setTimeout(() => {
            this.removeElement(explosion);
        }, 500);
    }

    // 創建分數浮動效果
    static createScoreFloat(x, y, score) {
        const scoreFloat = this.createElement('div', 'score-float');
        scoreFloat.textContent = '+' + score;
        scoreFloat.style.left = x + 'px';
        scoreFloat.style.top = y + 'px';
        document.getElementById('gameArea').appendChild(scoreFloat);
        
        setTimeout(() => {
            this.removeElement(scoreFloat);
        }, 1000);
    }

    // 播放音效（如果有音頻文件）
    static playSound(soundName, volume = 0.5) {
        // 這裡可以擴展音效功能
        // 由於沒有音頻文件，暫時使用console.log
        console.log(`播放音效: ${soundName}`);
    }

    // 震動效果（移動設備）
    static vibrate(duration = 100) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    // 創建連鎖反應效果 - 性能優化版，支援連續電擊
    static createChainLightning(startX, startY, endX, endY, intensity = 1, chainLevel = 0, isContinuous = false) {
        // 為連續電擊創建更細膩的閃電效果
        const lightningClass = isContinuous ? 'chain-lightning continuous-lightning' : 'chain-lightning';
        const lightning = this.createElement('div', lightningClass);
        lightning.style.position = 'absolute';
        lightning.style.left = '0px';
        lightning.style.top = '0px';
        lightning.style.width = '100%';
        lightning.style.height = '100%';
        lightning.style.pointerEvents = 'none';
        lightning.style.zIndex = '80';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.top = '0';
        svg.style.left = '0';
        
        // 連續電擊使用更多分支
        const branchCount = isContinuous ? 2 : 1;
        
        for (let branch = 0; branch < branchCount; branch++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            // 為連續電擊增加更多變化
            const segments = isContinuous ? Math.min(12, 8 + chainLevel) : Math.min(8, 6 + chainLevel);
            let pathData = `M ${startX} ${startY}`;
            
            for (let i = 1; i < segments; i++) {
                const progress = i / segments;
                const baseDeviation = isContinuous ? 25 : 15;
                const deviation = Math.min(30, baseDeviation + chainLevel * 3);
                const branchOffset = branch * 10; // 分支偏移
                
                const x = startX + (endX - startX) * progress + 
                         Utils.random(-deviation, deviation) + 
                         (branch > 0 ? branchOffset : 0);
                const y = startY + (endY - startY) * progress + 
                         Utils.random(-deviation, deviation);
                pathData += ` L ${x} ${y}`;
            }
            pathData += ` L ${endX + (branch > 0 ? Utils.random(-10, 10) : 0)} ${endY}`;
            
            path.setAttribute('d', pathData);
            
            // 連續電擊使用不同顏色和強度
            if (isContinuous) {
                const colors = ['#00FFFF', '#FFFFFF', '#87CEEB'];
                path.setAttribute('stroke', colors[branch % colors.length]);
                path.setAttribute('stroke-width', (2 + branch) * intensity);
                path.setAttribute('opacity', (0.6 - branch * 0.2) * intensity);
            } else {
                path.setAttribute('stroke', '#00FFFF');
                path.setAttribute('stroke-width', Math.min(8, 3 + chainLevel) * intensity);
                path.setAttribute('opacity', 0.8 * intensity);
            }
            
            path.setAttribute('fill', 'none');
            
            // 發光效果
            const glowIntensity = Math.min(15, 8 + chainLevel * 2) * intensity;
            path.style.filter = `drop-shadow(0 0 ${glowIntensity}px #00FFFF)`;
            
            svg.appendChild(path);
        }
        
        lightning.appendChild(svg);
        document.getElementById('gameArea').appendChild(lightning);
        
        // 連續電擊的持續時間極短，創造連續效果
        const duration = isContinuous ? 
            Math.min(80, 50 + chainLevel * 5) : 
            Math.min(300, 150 + chainLevel * 20);
            
        setTimeout(() => {
            this.removeElement(lightning);
        }, duration);
        
        return lightning;
    }

    // 創建電火花效果 - 性能優化版
    static createElectricSpark(x, y, intensity, chainLevel) {
        // 大幅減少電火花數量和複雜度
        const sparkCount = Math.min(3, 2 + Math.floor(chainLevel / 2));
        
        for (let i = 0; i < sparkCount; i++) {
            const spark = this.createElement('div', 'electric-spark');
            spark.style.position = 'absolute';
            spark.style.left = (x - 3) + 'px';
            spark.style.top = (y - 3) + 'px';
            spark.style.width = '6px';
            spark.style.height = '6px';
            spark.style.background = '#00FFFF';
            spark.style.borderRadius = '50%';
            spark.style.pointerEvents = 'none';
            spark.style.zIndex = '85';
            spark.style.opacity = intensity.toString();
            
            document.getElementById('gameArea').appendChild(spark);
            
            // 縮短存在時間
            setTimeout(() => {
                this.removeElement(spark);
            }, 150);
        }
    }

    // 計算連鎖反應目標
    static findChainTargets(centerX, centerY, fishes, range, maxCount, excludeIds = []) {
        const targets = [];
        
        fishes.forEach(fish => {
            if (fish.isDead || excludeIds.includes(fish.id)) return;
            
            const distance = this.getDistance(centerX, centerY, fish.x, fish.y);
            if (distance <= range) {
                targets.push({
                    fish: fish,
                    distance: distance
                });
            }
        });
        
        // 按距離排序，選擇最近的目標
        targets.sort((a, b) => a.distance - b.distance);
        return targets.slice(0, maxCount).map(t => t.fish);
    }
}

// 遊戲配置
const GAME_CONFIG = {
    // 炮台配置
    CANNON: {
        INITIAL_LEVEL: 1,
        MAX_LEVEL: 10,
        UPGRADE_COST_BASE: 100,
        UPGRADE_COST_MULTIPLIER: 1.5,
        DAMAGE_BASE: 10,
        DAMAGE_MULTIPLIER: 1.2,
        FIRE_RATE_BASE: 10,
        FIRE_RATE_MULTIPLIER: 1.1
    },
    
    // 子彈配置
    BULLET: {
        SPEED: 8,
        LIFETIME: 3000,
        SIZE: 3
    },
    
    // 魚類配置
    FISH: {
        MIN_COUNT: 40,
        MAX_COUNT: 70,
        SPAWN_RATE: 0.12,
        SPEED_RANGE: [0.5, 3],
        SCORE_MULTIPLIER: 1.2
    },
    
    // 賭注系統配置
    BET_SYSTEM: {
        INITIAL_COINS: 10000,  // 從5000增加到10000
        DEFAULT_BET: 2,        // 從3減少到2，更省錢
        MIN_BET: 1,
        MAX_BET: 100,
        BET_OPTIONS: [1, 2, 3, 5, 10, 20, 50], // 保持現有選項
        MIN_COINS_TO_PLAY: 1
    },
    
    // 遊戲區域配置
    GAME_AREA: {
        WIDTH: 800,
        HEIGHT: 600
    },
    
    CANVAS_WIDTH: 980,
    CANVAS_HEIGHT: 600,
    FISH_TYPES: [
        { name: '小魚', score: 2, speed: 1, size: 20, color: '#FFB6C1' },
        { name: '中魚', score: 5, speed: 0.8, size: 30, color: '#87CEEB' },
        { name: '大魚', score: 10, speed: 0.6, size: 40, color: '#98FB98' },
        { name: '金魚', score: 20, speed: 0.5, size: 35, color: '#FFD700' },
        { name: '鯊魚', score: 50, speed: 0.4, size: 60, color: '#708090' },
        { name: '鯨魚', score: 100, speed: 0.3, size: 80, color: '#4169E1' }
    ],
    CANNON_LEVELS: [
        { level: 1, power: 1, cost: 1, color: '#FFD700' },
        { level: 2, power: 2, cost: 2, color: '#FF6347' },
        { level: 3, power: 3, cost: 3, color: '#32CD32' },
        { level: 4, power: 4, cost: 4, color: '#FF69B4' },
        { level: 5, power: 5, cost: 5, color: '#9370DB' }
    ],
    INITIAL_SCORE: 10000,
    MIN_FISH_COUNT: 40,        // 進一步增加最少魚類數量
    MAX_FISH_COUNT: 70,        // 進一步增加最多魚類數量
    FISH_SPAWN_RATE: 0.12,     // 進一步提高魚類生成頻率
    CHAIN_REACTION_RANGE: 150, // 增加連鎖反應範圍
    CHAIN_DAMAGE_DECAY: 0.9,   // 減少連鎖傷害衰減
    MAX_CHAIN_COUNT: 8,        // 增加最大連鎖次數
    AUTO_LIGHTNING_MODE: true,  // 自動閃電模式
    CONTINUOUS_LIGHTNING: true, // 啟用連續電擊模式
    LIGHTNING_FIRE_RATE: 1,     // 連續電擊間隔（幀數）- 每幀都攻擊
    LIGHTNING_TARGET_COUNT: 1,  // 每次電擊一個目標
    LIGHTNING_DURATION: 50,     // 每次電擊持續時間（毫秒）- 大幅縮短
    LIGHTNING_INTENSITY: 0.3,   // 連續電擊傷害強度 - 降低傷害讓魚更耐打
    MAX_CONTINUOUS_TARGETS: 1,  // 同時只鎖定一個目標
    LOCK_TARGET_UNTIL_DEAD: true // 鎖定目標直到死亡
}; 