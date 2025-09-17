// Alternative bot.js with regular string concatenation to avoid backtick issues
require('dotenv').config();
const { Telegraf } = require('telegraf');
const Database = require('./database');
const Blockchain = require('./blockchain');

class DiceBotGame {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.database = new Database();
        this.blockchain = new Blockchain();
        this.pendingGames = new Map(); // For funding confirmations
        this.setupCommands();
        this.setupEventHandlers();
    }

    setupCommands() {
        const bot = this.bot;

        // Start command with comprehensive instructions
        bot.start((ctx) => {
            const startParam = ctx.startPayload;
            
            // Handle deep link for wallet connection
            if (startParam === 'connect') {
                return this.handlePrivateConnect(ctx);
            }
            
            // Handle deep link for wallet setup
            if (startParam === 'wallet') {
                return this.handlePrivateWalletSetup(ctx);
            }
            
            // Handle deep link for game funding
            if (startParam && startParam.startsWith('fund_')) {
                const gameId = startParam.substring(5);
                return this.handlePrivateFunding(ctx, gameId, 'create');
            }
            
            // Handle deep link for join funding
            if (startParam && startParam.startsWith('join_')) {
                const gameId = startParam.substring(5);
                return this.handlePrivateFunding(ctx, gameId, 'join');
            }
            
            const welcomeMessage = "🎲 **WildWest Dice Bot** 🎲\\n\\nWelcome to the ultimate dice gambling experience on Base!\\n\\n🪙 **ONLY ACCEPTS $WILDW TOKENS** 🪙\\nContract: 0x8129609E5303910464FCe3022a809fA44455Fe9A\\n\\n**🎯 HOW THE GAME WORKS:**\\n\\n**Game Setup:**\\n• Player 1 creates a game with a buy-in amount (e.g., 100 $WILDW)\\n• Player 2 joins by matching the same buy-in amount\\n• Both players deposit $WILDW tokens into the smart contract escrow\\n\\n**Game Play (Best of 3 Rounds):**\\n• Each round: Both players roll 2 dice simultaneously\\n• Your dice total = Dice 1 + Dice 2 (range: 2-12)\\n• Higher total wins the round\\n• First to win 2 rounds wins the entire pot!\\n\\n**🐍 SNAKE EYES RULE:**\\n• Rolling ⚀ ⚀ (both dice showing 1) = INSTANT LOSS\\n• Exception: If both players roll snake eyes in same round, game continues with 2 points each\\n\\n**💰 PAYOUTS:**\\n• Winner takes 99% of the total pot (198 $WILDW from 200 $WILDW pot)\\n• 1% house fee goes to lottery jackpot pool\\n• Automatic payout to your registered wallet address\\n\\n**🎰 LOTTERY BONUS:**\\n• Roll ⚅ ⚅ (double 6s) to trigger lottery chance\\n• If your dice total = 7 or 11, WIN THE ENTIRE LOTTERY POOL!\\n• Lottery pool grows from all game fees\\n\\n**Commands:**\\n/contract - Get $WILDW contract address for easy copying\\n/connect - Instructions to set payout wallet\\n/wallet <address> - Set your payout address (one-time setup)\\n/payout - View your current payout address\\n/create <amount> - Create new game (send $WILDW tokens)\\n/confirm <gameId> - Confirm game after sending $WILDW tokens\\n/join <gameId> - Join an existing game \\n/confirm_join <gameId> - Confirm join after sending $WILDW tokens\\n/games - View available games\\n/mygames - View your active games\\n/stats [username] - View player statistics\\n/scoreboard - View top players leaderboard\\n/jackpot - Check current lottery jackpot amount\\n/lottery - View lottery details\\n/howtoplay - Complete detailed game guide\\n/help - Show this help message\\n\\n**🎰 Lottery System:**\\n• 1% fee builds up jackpot pool\\n• Roll double 6s (⚅ ⚅) to trigger lottery\\n• Roll 7 or 11 total to win entire $WILDW pool!\\n\\n💡 **One-time setup:** Set your payout address once and you're ready to play! 💰\\n💰 **Get $WILDW tokens on Base network to start gambling!**\\n\\n🔒 **Privacy:** Payout addresses and funding are handled in private messages for security.";
            
            ctx.reply(welcomeMessage);
        });
    }

    async start() {
        console.log('🚀 Starting WildWest Dice Bot...');
        console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
        console.log('🤖 Bot:', process.env.TELEGRAM_BOT_USERNAME);
        
        try {
            await this.database.init();
            console.log('✅ Database connected successfully');
            
            await this.bot.launch();
            console.log('✅ WildWest Dice Bot is running!');
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            process.exit(1);
        }
    }
}

// Create and start the bot
const bot = new DiceBotGame();
bot.start();