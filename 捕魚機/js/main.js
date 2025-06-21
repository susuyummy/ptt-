// 遊戲主入口
let game = null;

// 當DOM加載完成時初始化遊戲
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    try {
        // 獲取畫布元素
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('找不到遊戲畫布元素');
        }

        // 檢查瀏覽器支援
        if (!canvas.getContext) {
            throw new Error('您的瀏覽器不支援HTML5 Canvas');
        }

        // 設置畫布大小
        setupCanvas(canvas);

            // 創建遊戲實例
    game = new FishingGame(canvas);
    
    // 設置賭注系統事件監聽器
    setupBetSystemListeners(game);
    
    // 延遲確保賭注面板可見
    setTimeout(() => {
        const betPanel = document.getElementById('betPanel');
        if (betPanel) {
            betPanel.style.display = 'block';
            betPanel.style.visibility = 'visible';
            betPanel.style.opacity = '1';
            console.log('賭注面板已設置為可見');
        } else {
            console.error('找不到賭注面板元素');
        }
    }, 100);

        // 設置視窗調整事件
        window.addEventListener('resize', () => {
            setupCanvas(canvas);
            if (game) {
                // 重新調整遊戲元素位置
                game.cannon.x = canvas.width / 2;
                game.cannon.y = canvas.height - 80;
            }
        });

        // 設置頁面可見性API
        document.addEventListener('visibilitychange', () => {
            if (game) {
                if (document.hidden) {
                    game.pause();
                } else {
                    // 當頁面重新可見時，不自動恢復遊戲，讓玩家手動繼續
                }
            }
        });

        // 設置頁面關閉前的確認
        window.addEventListener('beforeunload', (e) => {
            if (game && game.gameState === 'playing' && !game.isPaused) {
                e.preventDefault();
                e.returnValue = '您確定要離開遊戲嗎？未保存的進度將會丟失。';
                return e.returnValue;
            }
        });

        console.log('捕魚達人遊戲初始化成功！');
        
        // 顯示控制說明
        showControlInstructions();

    } catch (error) {
        console.error('遊戲初始化失敗:', error);
        showErrorMessage(error.message);
    }
}

function setupCanvas(canvas) {
    const container = document.getElementById('gameArea');
    const containerRect = container.getBoundingClientRect();
    
    // 設置畫布大小以適應容器
    const aspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT;
    let canvasWidth = containerRect.width;
    let canvasHeight = containerRect.height;
    
    // 保持寬高比
    if (canvasWidth / canvasHeight > aspectRatio) {
        canvasWidth = canvasHeight * aspectRatio;
    } else {
        canvasHeight = canvasWidth / aspectRatio;
    }
    
    // 設置畫布顯示大小
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // 設置畫布實際大小（用於繪製）
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    
    // 啟用圖像平滑
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

function showControlInstructions() {
    // 顯示控制說明（可選）
    const instructions = [
        '🎯 滑鼠移動：瞄準',
        '🔫 滑鼠點擊 / 空白鍵：射擊',
        '⬆️ U鍵：升級炮台',
        '⏸️ P鍵：暫停/繼續',
        '🎯 A鍵：切換自動瞄準',
        '📊 I鍵：顯示/隱藏調試信息',
        '🔄 R鍵：重新開始（遊戲結束時）'
    ];
    
    console.log('遊戲控制說明:');
    instructions.forEach(instruction => console.log(instruction));
}

function showErrorMessage(message) {
    // 顯示錯誤信息
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 16px;
        text-align: center;
        z-index: 10000;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <h3>遊戲初始化錯誤</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: red;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        ">重新載入頁面</button>
    `;
    document.body.appendChild(errorDiv);
}

// 全局鍵盤快捷鍵
document.addEventListener('keydown', function(e) {
    // 防止某些按鍵的默認行為
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    
    // F11 全屏切換
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
    
    // ESC 鍵暫停遊戲
    if (e.key === 'Escape' && game) {
        game.togglePause();
    }
});

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('無法進入全屏模式:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// 性能監控
function startPerformanceMonitoring() {
    if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.entryType === 'measure') {
                    console.log(`性能測量 ${entry.name}: ${entry.duration.toFixed(2)}ms`);
                }
            });
        });
        
        observer.observe({ entryTypes: ['measure'] });
    }
}

// 遊戲統計追蹤
function trackGameStats() {
    if (game && game.gameStats) {
        const stats = game.gameStats;
        const gameTime = (Date.now() - stats.startTime) / 1000; // 秒
        
        console.log('遊戲統計:', {
            遊戲時間: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toFixed(0).padStart(2, '0')}`,
            總射擊次數: stats.totalShots,
            總命中次數: stats.totalHits,
            命中率: `${stats.accuracy.toFixed(1)}%`,
            最高連擊: stats.highestCombo,
            當前分數: game.score
        });
    }
}

// 每30秒輸出一次遊戲統計（調試用）
setInterval(() => {
    if (game && game.gameState === 'playing') {
        trackGameStats();
    }
}, 30000);

// 移動設備適配
function setupMobileAdaptation() {
    // 檢測移動設備
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 移動設備的特殊設置
        document.body.classList.add('mobile');
        
        // 防止滾動
        document.body.addEventListener('touchmove', function(e) {
            if (e.target === document.getElementById('gameCanvas')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 防止縮放
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });
        
        // 隱藏地址欄
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.scrollTo(0, 1);
            }, 0);
        });
    }
}

// 初始化移動設備適配
setupMobileAdaptation();

// 啟動性能監控
startPerformanceMonitoring();

// 導出全局函數（用於調試）
window.gameDebug = {
    getGame: () => game,
    restartGame: () => game && game.restart(),
    pauseGame: () => game && game.pause(),
    resumeGame: () => game && game.resume(),
    getStats: () => game && game.fishManager.getStats(),
    addScore: (points) => game && game.addScore(points),
    spawnBoss: () => game && game.fishManager.spawnBossFish(),
    upgradeCannon: () => game && game.upgradeCannon(),
    setGodMode: (enabled) => {
        if (game) {
            if (enabled) {
                game.originalScore = game.score;
                game.score = 999999;
                console.log('上帝模式已啟用');
            } else {
                game.score = game.originalScore || GAME_CONFIG.INITIAL_SCORE;
                console.log('上帝模式已關閉');
            }
        }
    },
    trackStats: trackGameStats
};

// 控制台歡迎信息
console.log(`
🐠 歡迎來到捕魚達人遊戲! 🐠

遊戲指令:
- gameDebug.getGame() - 獲取遊戲實例
- gameDebug.getStats() - 查看遊戲統計
- gameDebug.setGodMode(true/false) - 開啟/關閉上帝模式
- gameDebug.trackStats() - 查看當前統計

祝您遊戲愉快！
`);

// 異常處理
window.addEventListener('error', function(e) {
    console.error('遊戲運行時錯誤:', e.error);
    
    // 嘗試恢復遊戲
    if (game && e.error.message.includes('game')) {
        console.log('嘗試重新初始化遊戲...');
        setTimeout(() => {
            try {
                initializeGame();
            } catch (error) {
                console.error('遊戲恢復失敗:', error);
            }
        }, 1000);
    }
});

// 未捕獲的 Promise 錯誤
window.addEventListener('unhandledrejection', function(e) {
    console.error('未處理的 Promise 錯誤:', e.reason);
    e.preventDefault();
});

// 設置賭注系統事件監聽器
function setupBetSystemListeners(game) {
    // 增加賭注按鈕
    const increaseBetBtn = document.getElementById('increaseBet');
    if (increaseBetBtn) {
        increaseBetBtn.addEventListener('click', () => {
            game.increaseBet();
            updatePresetButtonsState(game.currentBet);
        });
    }

    // 減少賭注按鈕
    const decreaseBetBtn = document.getElementById('decreaseBet');
    if (decreaseBetBtn) {
        decreaseBetBtn.addEventListener('click', () => {
            game.decreaseBet();
            updatePresetButtonsState(game.currentBet);
        });
    }

    // 預設賭注按鈕
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const betAmount = parseInt(btn.dataset.bet);
            game.setBet(betAmount);
            updatePresetButtonsState(betAmount);
        });
    });

    // 初始化預設按鈕狀態
    updatePresetButtonsState(game.currentBet);

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        if (game.gameState !== 'playing') return;

        switch (e.code) {
            case 'Equal': // + 鍵
            case 'NumpadAdd':
                e.preventDefault();
                game.increaseBet();
                updatePresetButtonsState(game.currentBet);
                break;
            case 'Minus': // - 鍵
            case 'NumpadSubtract':
                e.preventDefault();
                game.decreaseBet();
                updatePresetButtonsState(game.currentBet);
                break;
            case 'Digit1':
                e.preventDefault();
                game.setBet(1);
                updatePresetButtonsState(1);
                break;
            case 'Digit2':
                e.preventDefault();
                game.setBet(5);
                updatePresetButtonsState(5);
                break;
            case 'Digit3':
                e.preventDefault();
                game.setBet(10);
                updatePresetButtonsState(10);
                break;
            case 'Digit4':
                e.preventDefault();
                game.setBet(20);
                updatePresetButtonsState(20);
                break;
            case 'Digit5':
                e.preventDefault();
                game.setBet(50);
                updatePresetButtonsState(50);
                break;
            case 'Digit6':
                e.preventDefault();
                game.setBet(100);
                updatePresetButtonsState(100);
                break;
        }
    });
}

// 更新預設按鈕狀態
function updatePresetButtonsState(currentBet) {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        const betAmount = parseInt(btn.dataset.bet);
        if (betAmount === currentBet) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
} 