const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        // Handle different environments (Render vs local)
        const isProduction = process.env.NODE_ENV === 'production';
        this.dbPath = isProduction 
            ? '/tmp/dice_bot.db'  // Render's temporary directory
            : path.join(__dirname, '..', 'data', 'bot.db');
        
        this.db = null;
        this.initDatabase();
    }
    
    initDatabase() {
        console.log(`📂 Database environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📂 Database path: ${this.dbPath}`);
        
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err);
            } else {
                console.log('✅ Database connected successfully');
                this.createTables();
            }
        });
    }
    
    createTables() {
        // Users table - stores Telegram user to wallet mapping
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                telegram_id INTEGER PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                username TEXT,
                first_name TEXT,
                connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(telegram_id)
            )
        `);
        
        // Games table - stores game history
        this.db.run(`
            CREATE TABLE IF NOT EXISTS games (
                game_id TEXT PRIMARY KEY,
                challenger_telegram_id INTEGER,
                challenger_address TEXT,
                opponent_telegram_id INTEGER,
                opponent_address TEXT,
                buy_in REAL,
                status TEXT,
                winner_telegram_id INTEGER,
                winner_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                blockchain_tx_hash TEXT,
                lottery_rolled BOOLEAN DEFAULT FALSE
            )
        `);

        // Active games table - stores ongoing games with full state
        this.db.run(`
            CREATE TABLE IF NOT EXISTS active_games (
                game_id TEXT PRIMARY KEY,
                challenger_telegram_id INTEGER,
                challenger_name TEXT,
                challenger_address TEXT,
                opponent_telegram_id INTEGER,
                opponent_name TEXT,
                opponent_address TEXT,
                buy_in REAL,
                status TEXT,
                rounds_data TEXT, -- JSON string of rounds array
                current_round INTEGER DEFAULT 0,
                challenger_score INTEGER DEFAULT 0,
                opponent_score INTEGER DEFAULT 0,
                created_at INTEGER, -- timestamp
                expires_at INTEGER, -- timestamp
                FOREIGN KEY(challenger_telegram_id) REFERENCES users(telegram_id),
                FOREIGN KEY(opponent_telegram_id) REFERENCES users(telegram_id)
            )
        `);
        
        // Lottery rolls table - tracks all lottery attempts
        this.db.run(`
            CREATE TABLE IF NOT EXISTS lottery_rolls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT,
                player_telegram_id INTEGER,
                player_address TEXT,
                dice1 INTEGER,
                dice2 INTEGER,
                total INTEGER,
                won BOOLEAN,
                winnings REAL DEFAULT 0,
                rolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                tx_hash TEXT
            )
        `);
        
        console.log('✅ Database tables created/verified');
    }
    
    // User wallet management
    async connectWallet(telegramId, walletAddress, username = null, firstName = null) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users 
                (telegram_id, wallet_address, username, first_name, connected_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            
            stmt.run([telegramId, walletAddress, username, firstName], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }
    
    async getUserWallet(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT wallet_address, connected_at FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.wallet_address : null);
                    }
                }
            );
        });
    }
    
    async getAllConnectedUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT telegram_id, wallet_address, username, connected_at FROM users ORDER BY connected_at DESC',
                [],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }
    
    // Game management
    async saveGame(gameData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO games 
                (game_id, challenger_telegram_id, challenger_address, opponent_telegram_id, 
                 opponent_address, buy_in, status, created_at, blockchain_tx_hash) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                gameData.id,
                gameData.challenger,
                gameData.challengerAddress,
                gameData.opponent,
                gameData.opponentAddress,
                gameData.buyIn,
                gameData.status,
                new Date(gameData.createdAt).toISOString(),
                gameData.blockchainTxHash
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }
    
    async completeGame(gameId, winnerTelegramId, winnerAddress, txHash) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE games 
                SET status = 'completed', winner_telegram_id = ?, winner_address = ?, 
                    completed_at = CURRENT_TIMESTAMP, blockchain_tx_hash = ?
                WHERE game_id = ?
            `);
            
            stmt.run([winnerTelegramId, winnerAddress, txHash, gameId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }

    // Active Games Management
    async saveActiveGame(gameData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO active_games 
                (game_id, challenger_telegram_id, challenger_name, challenger_address, 
                 opponent_telegram_id, opponent_name, opponent_address, buy_in, status, 
                 rounds_data, current_round, challenger_score, opponent_score, created_at, expires_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const roundsJson = JSON.stringify(gameData.rounds || []);
            const expiresAt = gameData.createdAt + (30 * 60 * 1000); // 30 minutes
            
            stmt.run([
                gameData.id,
                gameData.challenger,
                gameData.challengerName || '',
                gameData.challengerAddress,
                gameData.opponent || null,
                gameData.opponentName || null,
                gameData.opponentAddress || null,
                gameData.buyIn,
                gameData.status,
                roundsJson,
                gameData.currentRound || 0,
                gameData.challengerScore || 0,
                gameData.opponentScore || 0,
                gameData.createdAt,
                expiresAt
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }

    async getActiveGame(gameId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM active_games WHERE game_id = ?`,
                [gameId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (row) {
                        // Convert database row back to game object
                        const gameData = {
                            id: row.game_id,
                            challenger: row.challenger_telegram_id,
                            challengerName: row.challenger_name,
                            challengerAddress: row.challenger_address,
                            opponent: row.opponent_telegram_id,
                            opponentName: row.opponent_name,
                            opponentAddress: row.opponent_address,
                            buyIn: row.buy_in,
                            status: row.status,
                            rounds: JSON.parse(row.rounds_data || '[]'),
                            currentRound: row.current_round,
                            challengerScore: row.challenger_score,
                            opponentScore: row.opponent_score,
                            createdAt: row.created_at
                        };
                        resolve(gameData);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    async getAllActiveGames() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM active_games WHERE expires_at > ?`,
                [Date.now()],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const games = new Map();
                        rows.forEach(row => {
                            const gameData = {
                                id: row.game_id,
                                challenger: row.challenger_telegram_id,
                                challengerName: row.challenger_name,
                                challengerAddress: row.challenger_address,
                                opponent: row.opponent_telegram_id,
                                opponentName: row.opponent_name,
                                opponentAddress: row.opponent_address,
                                buyIn: row.buy_in,
                                status: row.status,
                                rounds: JSON.parse(row.rounds_data || '[]'),
                                currentRound: row.current_round,
                                challengerScore: row.challenger_score,
                                opponentScore: row.opponent_score,
                                createdAt: row.created_at
                            };
                            games.set(row.game_id, gameData);
                        });
                        resolve(games);
                    }
                }
            );
        });
    }

    async deleteActiveGame(gameId) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM active_games WHERE game_id = ?`, [gameId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    async cleanExpiredActiveGames() {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM active_games WHERE expires_at < ?`, [Date.now()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, deleted: this.changes });
                }
            });
        });
    }
    
    // Lottery management
    async saveLotteryRoll(gameId, playerTelegramId, playerAddress, dice1, dice2, won, winnings, txHash) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO lottery_rolls 
                (game_id, player_telegram_id, player_address, dice1, dice2, total, won, winnings, tx_hash) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const total = dice1 + dice2;
            stmt.run([gameId, playerTelegramId, playerAddress, dice1, dice2, total, won, winnings, txHash], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, id: this.lastID });
                }
            });
            stmt.finalize();
        });
    }
    
    async markLotteryRolled(gameId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE games SET lottery_rolled = TRUE WHERE game_id = ?',
                [gameId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true, changes: this.changes });
                    }
                }
            );
        });
    }
    
    // Statistics
    async getPlayerStats(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(CASE WHEN winner_telegram_id = ? THEN 1 END) as games_won,
                    COUNT(CASE WHEN (challenger_telegram_id = ? OR opponent_telegram_id = ?) 
                               AND winner_telegram_id != ? AND status = 'completed' THEN 1 END) as games_lost,
                    (SELECT COUNT(*) FROM lottery_rolls WHERE player_telegram_id = ? AND won = 1) as lottery_wins,
                    (SELECT COALESCE(SUM(winnings), 0) FROM lottery_rolls WHERE player_telegram_id = ?) as lottery_winnings
                FROM games 
                WHERE challenger_telegram_id = ? OR opponent_telegram_id = ?
            `, [telegramId, telegramId, telegramId, telegramId, telegramId, telegramId, telegramId, telegramId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || { games_won: 0, games_lost: 0, lottery_wins: 0, lottery_winnings: 0 });
                }
            });
        });
    }
    
    async getLeaderboard(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.telegram_id,
                    u.username,
                    u.wallet_address,
                    COUNT(CASE WHEN g.winner_telegram_id = u.telegram_id THEN 1 END) as games_won,
                    COUNT(CASE WHEN (g.challenger_telegram_id = u.telegram_id OR g.opponent_telegram_id = u.telegram_id) 
                               AND g.winner_telegram_id != u.telegram_id AND g.status = 'completed' THEN 1 END) as games_lost,
                    COALESCE(lr.lottery_wins, 0) as lottery_wins,
                    COALESCE(lr.lottery_winnings, 0) as lottery_winnings
                FROM users u
                LEFT JOIN games g ON (g.challenger_telegram_id = u.telegram_id OR g.opponent_telegram_id = u.telegram_id)
                LEFT JOIN (
                    SELECT player_telegram_id, 
                           COUNT(CASE WHEN won = 1 THEN 1 END) as lottery_wins,
                           COALESCE(SUM(winnings), 0) as lottery_winnings
                    FROM lottery_rolls 
                    GROUP BY player_telegram_id
                ) lr ON lr.player_telegram_id = u.telegram_id
                GROUP BY u.telegram_id
                HAVING games_won > 0 OR games_lost > 0
                ORDER BY games_won DESC, lottery_winnings DESC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT telegram_id, username, wallet_address FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }
    
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('📁 Database connection closed');
                }
            });
        }
    }
}

module.exports = DatabaseService;