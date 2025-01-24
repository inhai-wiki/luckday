// 游戏配置
const GAME_CONFIG = {
    GAME_DURATION: 30,
    ITEM_SPAWN_INTERVAL: 300,
    BOMB_SPAWN_INTERVAL: 5000,
    ITEM_FALL_SPEED: 3,
    PLAYER_SPEED: 15,
    SCORE_PER_ITEM: 10,
    PLAYER_SIZE: 150,
    ITEM_SIZE: 50,
    BOMB_SIZE: 60
};

// 图片资源配置
const IMAGES = {
    player: 'image/user.png',
    treasures: [
        { type: 'yuanbao', src: 'image/yuanbao.png', sound: 'music1' },
        { type: 'hongbao', src: 'image/hongbao.png', sound: 'music1' },
        { type: 'fudai', src: 'image/fudai.png', sound: 'music2' },
        { type: 'jintiao', src: 'image/jintiao.png', sound: 'music2' },
        { type: 'zhuanshi', src: 'image/zhuanshi.png', sound: 'music3' },
        { type: 'zhihongbao', src: 'image/zhihongbao.png', sound: 'music3' },
        { type: 'dahongbao', src: 'image/dahongbao.png', sound: 'music4' }
    ],
    bomb: { type: 'bomb', src: 'image/bomb.png', sound: 'bombSound' }
};

// 游戏状态
class GameState {
    constructor() {
        this.score = 0;
        this.timeLeft = GAME_CONFIG.GAME_DURATION;
        this.isPlaying = false;
        this.playerX = 0;
        this.fallingItems = [];
        this.imageCache = {};
        this.lastSpawnTime = 0;
        this.lastBombSpawnTime = 0;
    }

    reset() {
        this.score = 0;
        this.timeLeft = GAME_CONFIG.GAME_DURATION;
        this.isPlaying = true;
        this.fallingItems = [];
        this.lastSpawnTime = 0;
        this.lastBombSpawnTime = 0;
    }
}

// 音频管理器
class AudioManager {
    constructor() {
        this.sounds = {
            backgroundMusic: document.getElementById('backgroundMusic'),
            button: document.getElementById('buttonSound'),
            bomb: document.getElementById('bombSound'),
            music1: document.getElementById('music1'),
            music2: document.getElementById('music2'),
            music3: document.getElementById('music3'),
            music4: document.getElementById('music4')
        };
    }

    play(soundId) {
        const sound = this.sounds[soundId];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('音频播放失败:', e));
        }
    }

    stopBackground() {
        this.sounds.backgroundMusic.pause();
        this.sounds.backgroundMusic.currentTime = 0;
    }
}

// 游戏管理器
class GameManager {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new GameState();
        this.audio = new AudioManager();
        this.elements = {
            welcomePage: document.getElementById('welcomePage'),
            gamePage: document.getElementById('gamePage'),
            resultModal: document.getElementById('resultModal'),
            score: document.getElementById('score'),
            timer: document.getElementById('timer'),
            finalScore: document.getElementById('finalScore'),
            startButton: document.getElementById('startButton'),
            restartButton: document.getElementById('restartButton'),
            player: document.getElementById('player')
        };

        this.bindEvents();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // 图片预加载
    async loadImages() {
        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        };

        try {
            // 加载玩家图片
            this.state.imageCache.player = await loadImage(IMAGES.player);

            // 加载财宝图片
            for (const treasure of IMAGES.treasures) {
                this.state.imageCache[treasure.type] = await loadImage(treasure.src);
            }

            // 加载炸弹图片
            this.state.imageCache.bomb = await loadImage(IMAGES.bomb.src);

            return true;
        } catch (error) {
            console.error('图片加载失败:', error);
            return false;
        }
    }

    // 调整Canvas大小
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.state.playerX = (this.canvas.width - GAME_CONFIG.PLAYER_SIZE) / 2;
    }

    // 事件绑定
    bindEvents() {
        // 开始按钮
        this.elements.startButton.addEventListener('click', () => this.startGame());

        // 重新开始按钮
        this.elements.restartButton.addEventListener('click', () => this.restart());

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (!this.state.isPlaying) return;

            if (e.key === 'ArrowLeft') {
                this.movePlayer(-1);
            } else if (e.key === 'ArrowRight') {
                this.movePlayer(1);
            }
        });

        // 触摸控制
        let touchStartX = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.state.isPlaying) return;
            e.preventDefault();

            const touchCurrentX = e.touches[0].clientX;
            const diffX = touchCurrentX - touchStartX;
            this.movePlayer(diffX > 0 ? 1 : -1);
            touchStartX = touchCurrentX;
        }, { passive: false });

        // 阻止页面滚动
        document.addEventListener('touchmove', (e) => {
            if (this.state.isPlaying) e.preventDefault();
        }, { passive: false });
    }

    // 移动玩家
    movePlayer(direction) {
        const newX = this.state.playerX + direction * GAME_CONFIG.PLAYER_SPEED;
        const maxX = this.canvas.width - GAME_CONFIG.PLAYER_SIZE;
        
        this.state.playerX = Math.max(0, Math.min(maxX, newX));
        this.elements.player.style.left = this.state.playerX + 'px';
    }

    // 生成掉落物
    spawnItem(timestamp) {
        // 生成普通物品
        if (timestamp - this.state.lastSpawnTime >= GAME_CONFIG.ITEM_SPAWN_INTERVAL) {
            const treasure = IMAGES.treasures[Math.floor(Math.random() * IMAGES.treasures.length)];
            const x = Math.random() * (this.canvas.width - GAME_CONFIG.ITEM_SIZE);
            
            this.state.fallingItems.push({
                x,
                y: -GAME_CONFIG.ITEM_SIZE,
                type: treasure.type,
                sound: treasure.sound
            });
            
            this.state.lastSpawnTime = timestamp;
        }

        // 生成炸弹
        if (timestamp - this.state.lastBombSpawnTime >= GAME_CONFIG.BOMB_SPAWN_INTERVAL) {
            const x = Math.random() * (this.canvas.width - GAME_CONFIG.BOMB_SIZE);
            
            this.state.fallingItems.push({
                x,
                y: -GAME_CONFIG.BOMB_SIZE,
                type: 'bomb',
                sound: IMAGES.bomb.sound
            });
            
            this.state.lastBombSpawnTime = timestamp;
        }
    }

    // 更新物品位置和检测碰撞
    updateItems() {
        const playerRect = {
            x: this.state.playerX,
            y: this.canvas.height - GAME_CONFIG.PLAYER_SIZE,
            width: GAME_CONFIG.PLAYER_SIZE,
            height: GAME_CONFIG.PLAYER_SIZE
        };

        this.state.fallingItems = this.state.fallingItems.filter(item => {
            item.y += GAME_CONFIG.ITEM_FALL_SPEED;

            // 检测碰撞
            const itemRect = {
                x: item.x,
                y: item.y,
                width: item.type === 'bomb' ? GAME_CONFIG.BOMB_SIZE : GAME_CONFIG.ITEM_SIZE,
                height: item.type === 'bomb' ? GAME_CONFIG.BOMB_SIZE : GAME_CONFIG.ITEM_SIZE
            };

            if (this.checkCollision(playerRect, itemRect)) {
                this.audio.play(item.sound);
                if (item.type === 'bomb') {
                    this.endGame();
                } else {
                    this.state.score += GAME_CONFIG.SCORE_PER_ITEM;
                    this.elements.score.textContent = this.state.score;
                }
                return false;
            }

            // 移除超出屏幕的物品
            return item.y < this.canvas.height;
        });
    }

    // 碰撞检测
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 渲染游戏画面
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染掉落物
        this.state.fallingItems.forEach(item => {
            const img = this.state.imageCache[item.type];
            const size = item.type === 'bomb' ? GAME_CONFIG.BOMB_SIZE : GAME_CONFIG.ITEM_SIZE;
            this.ctx.drawImage(img, item.x, item.y, size, size);
        });
    }

    // 游戏主循环
    gameLoop(timestamp) {
        if (!this.state.isPlaying) return;

        this.spawnItem(timestamp);
        this.updateItems();
        this.render();

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    // 更新计时器
    updateTimer() {
        this.state.timeLeft--;
        this.elements.timer.textContent = this.state.timeLeft;
        
        if (this.state.timeLeft <= 0) {
            this.endGame();
        }
    }

    // 开始游戏
    async startGame() {
        // 加载图片资源
        const loaded = await this.loadImages();
        if (!loaded) {
            alert('游戏资源加载失败，请刷新重试！');
            return;
        }

        this.audio.play('button');
        this.audio.play('backgroundMusic');
        
        this.elements.welcomePage.classList.remove('active');
        this.elements.gamePage.classList.add('active');
        this.elements.resultModal.style.display = 'none';
        
        this.state.reset();
        this.resizeCanvas();
        
        this.elements.score.textContent = '0';
        this.elements.timer.textContent = GAME_CONFIG.GAME_DURATION;
        
        // 启动游戏循环
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        
        // 启动计时器
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    // 结束游戏
    endGame() {
        this.state.isPlaying = false;
        clearInterval(this.timerInterval);
        
        this.elements.finalScore.textContent = this.state.score;
        this.elements.resultModal.style.display = 'block';
        this.audio.stopBackground();
    }

    // 重新开始
    restart() {
        this.elements.resultModal.style.display = 'none';
        this.elements.gamePage.classList.remove('active');
        this.elements.welcomePage.classList.add('active');
        this.audio.play('button');
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    const game = new GameManager();
});
