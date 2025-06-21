// 魚類管理器
class FishManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.fishes = [];
        this.fishGroups = [];
        this.spawnTimer = 0;
        this.spawnInterval = 40; // 大幅減少生成間隔
        this.maxFish = GAME_CONFIG.MAX_FISH_COUNT;
        this.minFish = GAME_CONFIG.MIN_FISH_COUNT;
        
        // 魚群管理
        this.groupSpawnTimer = 0;
        this.groupSpawnInterval = 200; // 大幅減少魚群生成間隔
        
        // 特殊魚類
        this.bossSpawnTimer = 0;
        this.bossSpawnInterval = 1800; // 30秒
        this.currentBoss = null;
        
        // 統計數據
        this.totalFishSpawned = 0;
        this.totalFishKilled = 0;
        this.fishKilledByType = new Array(GAME_CONFIG.FISH_TYPES.length).fill(0);
        
        // 難度調整
        this.difficultyLevel = 1;
        this.difficultyTimer = 0;
        this.difficultyInterval = 3600; // 60秒
        
        // 初始化魚群
        this.initializeFishes();
    }

    initializeFishes() {
        // 生成大量初始魚群
        for (let i = 0; i < this.minFish; i++) {
            this.spawnRandomFish();
        }
        
        // 立即生成多個魚群
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.spawnFishGroup();
            }, i * 500);
        }
    }

    update() {
        // 更新所有魚類
        this.updateFishes();
        
        // 更新魚群
        this.updateFishGroups();
        
        // 處理魚類生成
        this.handleSpawning();
        
        // 更新難度
        this.updateDifficulty();
        
        // 清理死亡的魚
        this.cleanupDeadFishes();
        
        // 更新統計
        this.updateStats();
    }

    updateFishes() {
        for (let i = this.fishes.length - 1; i >= 0; i--) {
            const fish = this.fishes[i];
            fish.update();
            
            // 檢查特殊行為
            const specialResult = fish.specialBehavior();
            if (specialResult) {
                // 如果魚產生了新的魚（如鯨魚），添加到魚群
                if (Array.isArray(specialResult)) {
                    this.fishes.push(...specialResult);
                }
            }
            
            // 移除應該被清理的魚
            if (fish.shouldRemove) {
                this.fishes.splice(i, 1);
            }
        }
    }

    updateFishGroups() {
        for (let i = this.fishGroups.length - 1; i >= 0; i--) {
            const group = this.fishGroups[i];
            group.update();
            
            if (group.shouldRemove) {
                this.fishGroups.splice(i, 1);
            }
        }
    }

    handleSpawning() {
        this.spawnTimer++;
        this.groupSpawnTimer++;
        this.bossSpawnTimer++;
        
        // 常規魚類生成
        if (this.spawnTimer >= this.spawnInterval && this.fishes.length < this.maxFish) {
            this.spawnRandomFish();
            this.spawnTimer = 0;
        }
        
        // 魚群生成
        if (this.groupSpawnTimer >= this.groupSpawnInterval) {
            this.spawnFishGroup();
            this.groupSpawnTimer = 0;
        }
        
        // Boss魚生成
        if (this.bossSpawnTimer >= this.bossSpawnInterval && !this.currentBoss) {
            this.spawnBossFish();
            this.bossSpawnTimer = 0;
        }
    }

    spawnRandomFish() {
        const type = this.getRandomFishType();
        const position = this.getRandomSpawnPosition();
        
        const fish = new Fish(position.x, position.y, type);
        this.fishes.push(fish);
        this.totalFishSpawned++;
    }

    spawnFishGroup() {
        const groupType = Utils.randomInt(0, 2); // 0: 圓形, 1: 直線, 2: V字形
        const fishType = this.getRandomFishType();
        const fishCount = Utils.randomInt(12, 20); // 大幅增加魚群數量
        const position = this.getRandomSpawnPosition();
        
        const group = new FishGroup(position.x, position.y, groupType, fishType, fishCount);
        this.fishGroups.push(group);
        
        // 將魚群的魚添加到主魚群中
        this.fishes.push(...group.fishes);
        this.totalFishSpawned += fishCount;
    }

    spawnBossFish() {
        const bossType = Utils.randomInt(4, 5); // 鯊魚或鯨魚
        const position = this.getRandomSpawnPosition();
        
        const boss = new Fish(position.x, position.y, bossType);
        boss.isBoss = true;
        boss.health = boss.score * 2; // Boss有更多血量
        boss.maxHealth = boss.health;
        
        this.currentBoss = boss;
        this.fishes.push(boss);
        this.totalFishSpawned++;
        
        // Boss出現特效
        Utils.createExplosion(position.x, position.y);
        Utils.playSound('bossSpawn');
    }

    getRandomFishType() {
        // 根據難度調整魚類類型概率
        const weights = [
            40 - this.difficultyLevel * 2, // 小魚
            30 - this.difficultyLevel * 1, // 中魚
            20 + this.difficultyLevel * 1, // 大魚
            7 + this.difficultyLevel * 1,  // 金魚
            2 + this.difficultyLevel * 0.5, // 鯊魚
            1 + this.difficultyLevel * 0.3  // 鯨魚
        ];
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }
        
        return 0; // 默認小魚
    }

    getRandomSpawnPosition() {
        const side = Utils.randomInt(0, 3); // 0: 左, 1: 右, 2: 上, 3: 下
        const margin = 50;
        
        switch (side) {
            case 0: // 左側
                return {
                    x: -margin,
                    y: Utils.random(margin, this.canvas.height - margin)
                };
            case 1: // 右側
                return {
                    x: this.canvas.width + margin,
                    y: Utils.random(margin, this.canvas.height - margin)
                };
            case 2: // 上側
                return {
                    x: Utils.random(margin, this.canvas.width - margin),
                    y: -margin
                };
            case 3: // 下側
                return {
                    x: Utils.random(margin, this.canvas.width - margin),
                    y: this.canvas.height + margin
                };
        }
    }

    updateDifficulty() {
        this.difficultyTimer++;
        
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.difficultyLevel++;
            this.difficultyTimer = 0;
            
            // 調整生成間隔
            this.spawnInterval = Math.max(60, this.spawnInterval - 10);
            this.groupSpawnInterval = Math.max(300, this.groupSpawnInterval - 30);
            this.bossSpawnInterval = Math.max(900, this.bossSpawnInterval - 60);
            
            // 增加最大魚數量
            this.maxFish = Math.min(25, this.maxFish + 1);
            
            console.log(`難度提升到等級 ${this.difficultyLevel}`);
        }
    }

    cleanupDeadFishes() {
        for (let i = this.fishes.length - 1; i >= 0; i--) {
            const fish = this.fishes[i];
            // 魚死亡後立即移除，不等待動畫完成
            if (fish.isDead) {
                // 更新統計
                this.totalFishKilled++;
                this.fishKilledByType[fish.type]++;
                
                // 如果是Boss魚，清除Boss狀態
                if (fish === this.currentBoss) {
                    this.currentBoss = null;
                }
                
                this.fishes.splice(i, 1);
            }
        }
    }

    updateStats() {
        // 更新魚類統計信息
        // 這裡可以添加更多統計邏輯
    }

    draw(ctx) {
        // 繪製所有魚類
        this.fishes.forEach(fish => {
            fish.draw(ctx);
            
            // 如果是Boss魚，繪製血量條
            if (fish.isBoss && fish.health !== undefined) {
                this.drawBossHealthBar(ctx, fish);
            }
        });
        
        // 繪製魚群效果
        this.fishGroups.forEach(group => {
            group.draw(ctx);
        });
    }

    drawBossHealthBar(ctx, boss) {
        const barWidth = 100;
        const barHeight = 8;
        const x = boss.x - barWidth / 2;
        const y = boss.y - boss.radius - 20;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 血量
        const healthPercent = boss.health / boss.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        const healthColor = healthPercent > 0.6 ? '#00FF00' : 
                           healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, healthWidth, barHeight);
        
        // 邊框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    // 碰撞檢測
    checkBulletCollisions(bullets) {
        const collisions = [];
        
        bullets.forEach(bullet => {
            this.fishes.forEach(fish => {
                if (!fish.isDead && bullet.checkCollision(fish)) {
                    // 檢查是否可以擊中這條魚
                    if (bullet.hit(fish)) {
                        collisions.push({ bullet, fish });
                    }
                }
            });
        });
        
        return collisions;
    }

    // 擊中魚類
    hitFish(fish, damage) {
        const result = fish.takeDamage(damage);
        if (result.killed) {
            // 魚類死亡，給予分數和金幣獎勵
            const coinReward = this.calculateCoinReward(fish);
            return {
                score: fish.score,
                coins: coinReward,
                killed: true,
                fish: fish
            };
        } else {
            // 未死亡，給予少量分數獎勵，不給金幣
            return {
                score: Math.floor(fish.score * 0.1),
                coins: 0,
                killed: false,
                fish: fish
            };
        }
    }

    // 計算金幣獎勵
    calculateCoinReward(fish) {
        // 基礎金幣獎勵 = 魚類分數 / 3，但至少3個金幣 - 再次大幅增加基礎獎勵
        let baseReward = Math.max(3, Math.floor(fish.score / 3));
        
        // 根據魚類類型調整獎勵 - 再次增加所有倍數
        const typeMultipliers = [
            3.0,  // 小魚 (類型0) - 從2.0提升到3.0
            4.0,  // 中魚 (類型1) - 從2.5提升到4.0
            5.0,  // 大魚 (類型2) - 從3.0提升到5.0
            6.0,  // 金魚 (類型3) - 從4.0提升到6.0
            8.0,  // 鯊魚 (類型4) - 從6.0提升到8.0
            12.0  // 鯨魚 (類型5) - 從10.0提升到12.0
        ];
        
        const multiplier = typeMultipliers[fish.type] || 3.0;
        let coinReward = Math.floor(baseReward * multiplier);
        
        // Boss魚額外獎勵 - 增加到4倍
        if (fish.isBoss) {
            coinReward *= 4;
        }
        
        // 難度獎勵 (難度越高，獎勵越多) - 增加獎勵比例到25%
        const difficultyBonus = 1 + (this.difficultyLevel - 1) * 0.25;
        coinReward = Math.floor(coinReward * difficultyBonus);
        
        return coinReward;
    }

    // 獲取最近的魚（用於自動瞄準）
    getClosestFish(x, y, maxDistance = 200) {
        let closestFish = null;
        let closestDistance = maxDistance;
        
        this.fishes.forEach(fish => {
            if (!fish.isDead) {
                const distance = Utils.getDistance(x, y, fish.x, fish.y);
                if (distance < closestDistance) {
                    closestFish = fish;
                    closestDistance = distance;
                }
            }
        });
        
        return closestFish;
    }

    // 獲取指定範圍內的所有魚
    getFishesInRange(x, y, range) {
        return this.fishes.filter(fish => {
            if (fish.isDead) return false;
            const distance = Utils.getDistance(x, y, fish.x, fish.y);
            return distance <= range;
        });
    }

    // 獲取統計信息
    getStats() {
        return {
            totalFishSpawned: this.totalFishSpawned,
            totalFishKilled: this.totalFishKilled,
            fishKilledByType: this.fishKilledByType,
            aliveFishCount: this.fishes.filter(f => !f.isDead).length,
            difficultyLevel: this.difficultyLevel,
            currentBoss: this.currentBoss
        };
    }

    // 清理所有魚類
    clearAllFishes() {
        this.fishes = [];
        this.fishGroups = [];
        this.currentBoss = null;
    }

    // 重置管理器
    reset() {
        this.clearAllFishes();
        this.totalFishSpawned = 0;
        this.totalFishKilled = 0;
        this.fishKilledByType = new Array(GAME_CONFIG.FISH_TYPES.length).fill(0);
        this.difficultyLevel = 1;
        this.difficultyTimer = 0;
        this.spawnTimer = 0;
        this.groupSpawnTimer = 0;
        this.bossSpawnTimer = 0;
        this.spawnInterval = 120;
        this.groupSpawnInterval = 600;
        this.bossSpawnInterval = 1800;
        this.maxFish = GAME_CONFIG.MAX_FISH_COUNT;
        
        this.initializeFishes();
    }
}

// 魚群類
class FishGroup {
    constructor(x, y, type, fishType, fishCount) {
        this.x = x;
        this.y = y;
        this.type = type; // 0: 圓形, 1: 直線, 2: V字形
        this.fishType = fishType;
        this.fishCount = fishCount;
        this.fishes = [];
        this.shouldRemove = false;
        
        // 移動參數
        this.speed = 0.5;
        this.direction = Utils.random(0, Math.PI * 2);
        this.formation = this.createFormation();
        
        this.createFishes();
    }

    createFormation() {
        const positions = [];
        
        switch (this.type) {
            case 0: // 圓形
                for (let i = 0; i < this.fishCount; i++) {
                    const angle = (Math.PI * 2 / this.fishCount) * i;
                    const radius = 50;
                    positions.push({
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius
                    });
                }
                break;
                
            case 1: // 直線
                for (let i = 0; i < this.fishCount; i++) {
                    positions.push({
                        x: i * 40 - (this.fishCount - 1) * 20,
                        y: 0
                    });
                }
                break;
                
            case 2: // V字形
                for (let i = 0; i < this.fishCount; i++) {
                    const side = i < this.fishCount / 2 ? -1 : 1;
                    const index = i < this.fishCount / 2 ? i : i - Math.floor(this.fishCount / 2);
                    positions.push({
                        x: side * index * 30,
                        y: Math.abs(index) * 20
                    });
                }
                break;
        }
        
        return positions;
    }

    createFishes() {
        for (let i = 0; i < this.fishCount; i++) {
            const formationPos = this.formation[i];
            const fish = new Fish(
                this.x + formationPos.x,
                this.y + formationPos.y,
                this.fishType
            );
            
            // 設置魚群標記
            fish.inGroup = true;
            fish.groupIndex = i;
            fish.groupParent = this;
            
            this.fishes.push(fish);
        }
    }

    update() {
        // 更新魚群中心位置
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
        
        // 更新魚群中每條魚的目標位置
        for (let i = 0; i < this.fishes.length; i++) {
            const fish = this.fishes[i];
            if (!fish.isDead) {
                const formationPos = this.formation[i];
                const targetX = this.x + formationPos.x;
                const targetY = this.y + formationPos.y;
                
                // 讓魚游向目標位置
                const dx = targetX - fish.x;
                const dy = targetY - fish.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    fish.vx = (dx / distance) * fish.speed;
                    fish.vy = (dy / distance) * fish.speed;
                }
            }
        }
        
        // 檢查魚群是否應該被移除
        const aliveFishes = this.fishes.filter(fish => !fish.isDead);
        if (aliveFishes.length === 0) {
            this.shouldRemove = true;
        }
    }

    draw(ctx) {
        // 繪製魚群連接線（可選）
        if (this.fishes.length > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            
            for (let i = 0; i < this.fishes.length - 1; i++) {
                const fish1 = this.fishes[i];
                const fish2 = this.fishes[i + 1];
                
                if (!fish1.isDead && !fish2.isDead) {
                    ctx.beginPath();
                    ctx.moveTo(fish1.x, fish1.y);
                    ctx.lineTo(fish2.x, fish2.y);
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        }
    }
} 