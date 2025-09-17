// WildWest Dice Bot - Fixed for Render deployment v1.1
const { Telegraf, Markup } = require('telegraf');
const { ethers } = require('ethers');
const BlockchainService = require('./blockchain');
const DatabaseService = require('./database');
require('dotenv').config();

class DiceBotGame {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.blockchain = new BlockchainService();
        this.database = new DatabaseService();
        
        // Game state storage for active games only (temporary)
        this.activeGames = new Map(); // gameId -> gameData
        
        this.setupCommands();
        this.setupCallbacks();
        this.setupBotCommands(); // Set up command menu for Telegram
    }
    
    async setupBotCommands() {
        // Set up command menu that appears when users type /
        const commands = [
            { command: 'start', description: '🚀 Start the WildWest Dice Bot' },
            { command: 'howtoplay', description: '📖 Detailed game instructions' },
            { command: 'contract', description: '📋 Get $WILDW contract address' },
            { command: 'connect', description: '🔗 Connect your payout wallet' },
            { command: 'create', description: '🎲 Create a new dice game' },
            { command: 'join', description: '🃏 Join an existing game' },
            { command: 'games', description: '📋 View available games' },
            { command: 'mygames', description: '👤 View your active games' },
            { command: 'stats', description: '📊 Check your game statistics' },
            { command: 'lottery', description: '🎰 Check lottery pool status' },
            { command: 'leaderboard', description: '🏆 View top players' },
            { command: 'jackpot', description: '💰 Check current jackpot' },
            { command: 'payout', description: '💳 View your payout address' },
            { command: 'help', description: '❓ Get help and instructions' }
        ];
        
        try {
            await this.bot.telegram.setMyCommands(commands);
            console.log('✅ Bot commands menu set up successfully');
        } catch (error) {
            console.error('❌ Failed to set up bot commands:', error);
        }
    }
    
    
    setupCommands() {
        this.bot.command('start', async (ctx) => {
            const args = ctx.message.text.split(' ');
            const startParam = args.length > 1 ? args[1] : null;
            
            // Handle deep link parameters for private operations
            if (startParam) {
                if (startParam === 'connect') {
                    return ctx.command('connect')(ctx);
                }
                if (startParam === 'wallet') {
                    return ctx.reply('🔒 **Set Your Payout Wallet (Private & Secure)**\n\nPlease provide your Base wallet address:\n\n`/wallet YOUR_WALLET_ADDRESS`\n\nExample: `/wallet 0x742d35Cc6b392e82e721C4C8c2b1c93d0E3d0123`', { parse_mode: 'Markdown' });
                }
                if (startParam === 'payout') {
                    return ctx.command('payout')(ctx);
                }
                if (startParam.startsWith('fund_')) {
                    const gameId = startParam.substring(5);
                    return this.handlePrivateFunding(ctx, gameId, 'create');
                }
                if (startParam.startsWith('join_')) {
                    const gameId = startParam.substring(5);
                    return this.handlePrivateFunding(ctx, gameId, 'join');
                }
            }
            
            const welcomeMessage = "🎲 **WildWest Dice Bot** 🎲\n\nWelcome to the ultimate dice gambling experience on Base!\n\n🪙 **ONLY ACCEPTS $WILDW TOKENS** 🪙\nContract: 0x8129609E5303910464FCe3022a809fA44455Fe9A\n\n**🎯 HOW THE GAME WORKS:**\n\n**Game Setup:**\n• Player 1 creates a game with a buy-in amount (e.g., 100 $WILDW)\n• Player 2 joins by matching the same buy-in amount\n• Both players deposit $WILDW tokens into the smart contract escrow\n\n**Game Play (Best of 3 Rounds):**\n• Each round: Both players roll 2 dice simultaneously\n• Your dice total = Dice 1 + Dice 2 (range: 2-12)\n• Higher total wins the round\n• First to win 2 rounds wins the entire pot!\n\n**🐍 SNAKE EYES RULE:**\n• Rolling ⚀ ⚀ (both dice showing 1) = INSTANT LOSS\n• Exception: If both players roll snake eyes in same round, game continues with 2 points each\n\n**💰 PAYOUTS:**\n• Winner takes 99% of the total pot (198 $WILDW from 200 $WILDW pot)\n• 1% house fee goes to lottery jackpot pool\n• Automatic payout to your registered wallet address\n\n**🎰 LOTTERY BONUS:**\n• Every winner gets a lottery chance after winning a game!\n• Roll 7 or 11 total to WIN THE ENTIRE LOTTERY POOL!\n• Lottery pool grows from all game fees\n\n**Commands:**\n/contract - Get $WILDW contract address for easy copying\n/connect - Instructions to set payout wallet\n/wallet <address> - Set your payout address (one-time setup)\n/payout - View your current payout address\n/create <amount> - Create new game (send $WILDW tokens)\n/confirm <gameId> - Confirm game after sending $WILDW tokens\n/join <gameId> - Join an existing game \n/confirm_join <gameId> - Confirm join after sending $WILDW tokens\n/games - View available games\n/mygames - View your active games\n/stats [username] - View player statistics\n/scoreboard - View top players leaderboard\n/jackpot - Check current lottery jackpot amount\n/lottery - View lottery details\n/howtoplay - Complete detailed game guide\n/help - Show this help message\n\n**🎰 Lottery System:**\n• 1% fee builds up jackpot pool\n• Winners get lottery chance after every game win!\n• Roll 7 or 11 total to win entire $WILDW pool!\n\n💡 **One-time setup:** Set your payout address once and you're ready to play! 💰\n💰 **Get $WILDW tokens on Base network to start gambling!**\n\n🔒 **Privacy:** Payout addresses and funding are handled in private messages for security.";
            
            ctx.reply(welcomeMessage);
        });
        
        this.bot.command('connect', (ctx) => {
            const userId = ctx.from.id;
            
            // Check if this is a private message
            if (ctx.chat.type !== 'private') {
                return ctx.reply('🔒 **Privacy Required!**\n\nPlease message me privately to set your payout address.\n\n👆 Click my username above and select "Send Message" or search for me in your DMs.', { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '💬 Message Bot Privately', url: `https://t.me/${ctx.botInfo.username}?start=connect` }
                        ]]
                    }
                });
            }
            
            const message = `
� **Set Your Payout Wallet (Private & Secure)**

Please provide your Base wallet address where winnings should be sent:

\`/wallet YOUR_WALLET_ADDRESS\`

Example: \`/wallet 0x742d35Cc6b392e82e721C4C8c2b1c93d0E3d0123\`

💡 **This is a one-time setup** - once you set your payout address, all future game winnings will automatically be sent there!

⚠️ **Important:** Make sure you own this wallet address on Base network!

🔒 **Privacy:** Your payout address is stored securely and only visible to you.

**After setup:**
• Use \`/payout\` to view your current address (private message only)
• Use \`/wallet NEW_ADDRESS\` to change it anytime
            `;
            
            ctx.reply(message, { parse_mode: 'Markdown' });
        });
        
        this.bot.command('wallet', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            // Check if this is a private message
            if (ctx.chat.type !== 'private') {
                return ctx.reply('🔒 **Privacy Required!**\n\nPlease message me privately to set your payout address for security.\n\n👆 Click my username above and select "Send Message" or search for me in your DMs.', { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '💬 Message Bot Privately', url: `https://t.me/${ctx.botInfo.username}?start=wallet` }
                        ]]
                    }
                });
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please provide your payout wallet address: /wallet YOUR_ADDRESS');
            }
            
            const walletAddress = args[1];
            
            if (!ethers.isAddress(walletAddress)) {
                return ctx.reply('❌ Invalid wallet address format. Please check and try again.');
            }
            
            // Check if user already has a wallet set
            const existingWallet = await this.database.getUserWallet(userId);
            const isUpdate = existingWallet !== null;
            
            try {
                await this.database.connectWallet(
                    userId, 
                    walletAddress, 
                    ctx.from.username, 
                    ctx.from.first_name
                );
                
                if (isUpdate) {
                    ctx.reply(`✅ Payout wallet updated successfully!\n📍 New Address: \`${walletAddress}\`\n📍 Previous: \`${existingWallet}\`\n\n🎮 All future winnings will be sent to the new address.\n🔒 Your address is stored securely and privately.`, { parse_mode: 'Markdown' });
                } else {
                    ctx.reply(`✅ Payout wallet set successfully!\n📍 Address: \`${walletAddress}\`\n\n🎮 Ready to play! Use /create <amount> to start a game.\n💡 **One-time setup complete** - you won't need to set this again!\n🔒 Your address is stored securely and privately.`, { parse_mode: 'Markdown' });
                }
            } catch (error) {
                console.error('Database error connecting wallet:', error);
                ctx.reply('❌ Error setting payout wallet. Please try again.');
            }
        });
        
        // Command to view/manage current payout address
        this.bot.command('payout', async (ctx) => {
            const userId = ctx.from.id;
            
            // Check if this is a private message
            if (ctx.chat.type !== 'private') {
                return ctx.reply('🔒 **Privacy Required!**\n\nPlease message me privately to view your payout address for security.\n\n👆 Click my username above and select "Send Message" or search for me in your DMs.', { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '💬 Message Bot Privately', url: `https://t.me/${ctx.botInfo.username}?start=payout` }
                        ]]
                    }
                });
            }
            
            try {
                const walletAddress = await this.database.getUserWallet(userId);
                
                if (!walletAddress) {
                    const message = `
❌ **No Payout Address Set**

You need to set your payout address first:
\`/wallet YOUR_WALLET_ADDRESS\`

Example: \`/wallet 0x742d35Cc6b392e82e721C4C8c2b1c93d0E3d0123\`

💡 **This is a one-time setup** - you won't need to do it again unless you want to change it later.

🔒 **Privacy:** All payout address operations are done in private messages for security.
                    `;
                    return ctx.reply(message, { parse_mode: 'Markdown' });
                }
                
                const message = `
💰 **Your Payout Address**

📍 Current Address: \`${walletAddress}\`

✅ All game winnings will be sent here automatically.

**To change your address:**
\`/wallet NEW_ADDRESS\`

**To start playing:**
• /create <amount> - Create new game (will prompt for private funding)
• /games - View available games

🔒 **Privacy:** Your payout address is stored securely and only visible to you in private messages.
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error retrieving payout address: ${error.message}`);
            }
        });
        
        this.bot.command('create', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            const walletAddress = await this.database.getUserWallet(userId);
            if (!walletAddress) {
                return ctx.reply('❌ Please set your payout wallet first using /connect');
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please specify buy-in amount: /create 100');
            }
            
            const buyInAmount = parseFloat(args[1]);
            if (isNaN(buyInAmount) || buyInAmount <= 0) {
                return ctx.reply('❌ Invalid buy-in amount. Must be a positive number.');
            }
            
            try {
                // Generate a temporary game ID for tracking
                const gameId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                
                // Store game in local state as "pending"
                this.activeGames.set(gameId, {
                    id: gameId,
                    challenger: userId,
                    challengerAddress: walletAddress,
                    challengerName: ctx.from.username || `User${userId.toString().slice(-4)}`,
                    opponent: null,
                    opponentAddress: null,
                    buyIn: buyInAmount,
                    status: 'pending_deposit',
                    rounds: [],
                    currentRound: 0,
                    challengerScore: 0,
                    opponentScore: 0,
                    createdAt: Date.now()
                });
                
                const message = `
🎮 **Game Created!**

🆔 Game ID: \`${gameId}\`
💰 Buy-in: ${buyInAmount} $WILDW tokens
📍 Your payout address: \`${walletAddress}\`

� **Please message me privately to fund this game securely**

Click the button below to continue in a private message:
                `;
                
                ctx.reply(message, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔒 Fund Game Privately', url: `https://t.me/${ctx.botInfo.username}?start=fund_${gameId}` }
                        ]]
                    }
                });
                
                // Set timeout to clean up if not confirmed
                setTimeout(() => {
                    if (this.activeGames.has(gameId) && this.activeGames.get(gameId).status === 'pending_deposit') {
                        this.activeGames.delete(gameId);
                    }
                }, 30 * 60 * 1000); // 30 minutes
                
            } catch (error) {
                ctx.reply(`❌ Failed to create game: ${error.message}`);
            }
        });
        
        this.bot.command('confirm', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            // Recommend private message for funding confirmations
            if (ctx.chat.type !== 'private') {
                return ctx.reply('🔒 **Privacy Recommended**\n\nFor security, please confirm your game funding in a private message.\n\n👆 Click my username above and send the command privately.', { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '💬 Message Bot Privately', url: `https://t.me/${ctx.botInfo.username}` }
                        ]]
                    }
                });
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please specify game ID: /confirm <gameId>');
            }
            
            const gameId = args[1];
            const game = this.activeGames.get(gameId);
            
            if (!game || game.challenger !== userId) {
                return ctx.reply('❌ Game not found or you are not the creator.');
            }
            
            if (game.status !== 'pending_deposit') {
                return ctx.reply('❌ Game deposit already confirmed or game is no longer pending.');
            }
            
            try {
                // Verify player has deposited the required tokens
                const walletAddress = await this.database.getUserWallet(userId);
                const depositBalance = await this.blockchain.getPlayerDeposit(walletAddress);
                
                ctx.reply('🔍 Checking your deposit on the blockchain...');
                
                if (parseFloat(depositBalance) < game.buyIn) {
                    const message = `
❌ **Insufficient Deposit Detected**

💰 Required: ${game.buyIn} WWT
💰 Your Deposit: ${depositBalance} WWT
💰 Still Needed: ${game.buyIn - parseFloat(depositBalance)} WWT

**Please send the remaining tokens to:**
\`${this.blockchain.contractAddress}\`

⏰ Game expires in ${Math.round((game.createdAt + 30*60*1000 - Date.now()) / 60000)} minutes

🔄 Use \`/confirm ${gameId}\` again after sending tokens
                    `;
                    return ctx.reply(message, { parse_mode: 'Markdown' });
                }
                
                // ✅ Deposit verified! Create game on blockchain
                const gameResult = await this.blockchain.createBlockchainGame(walletAddress, game.buyIn);
                
                // Update game status
                game.status = 'waiting';
                game.blockchainGameId = gameResult.gameId;
                game.blockchainTxHash = gameResult.txHash;
                
                const message = `
✅ **Game Confirmed!**

� Game ID: \`${gameId}\`
🎯 Status: Waiting for opponent
🔗 Tx: ${this.blockchain.formatTransactionUrl(gameResult.txHash)}

Share this game ID with someone to challenge them!
They can join with: /join ${gameId}
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
                
            } catch (error) {
                ctx.reply(`❌ Failed to confirm game: ${error.message}`);
            }
        });
        
        this.bot.command('stats', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            let targetUser = null;
            if (args.length > 1) {
                // Look up by username (without @)
                const username = args[1].replace('@', '');
                targetUser = await this.database.getUserByUsername(username);
                if (!targetUser) {
                    return ctx.reply(`❌ User @${username} not found. They may not have set a payout wallet yet.`);
                }
            } else {
                const walletAddress = await this.database.getUserWallet(userId);
                if (!walletAddress) {
                    return ctx.reply('❌ Please set your payout wallet first using /connect, or specify a username: /stats @username');
                }
                targetUser = { telegram_id: userId, wallet_address: walletAddress };
            }
            
            try {
                const stats = await this.database.getPlayerStats(targetUser.telegram_id);
                const totalGames = stats.games_won + stats.games_lost;
                const winRate = totalGames > 0 ? ((stats.games_won / totalGames) * 100).toFixed(1) : 0;
                
                const displayName = targetUser.username ? `@${targetUser.username}` : `User${targetUser.telegram_id.toString().slice(-4)}`;
                
                const message = `
📊 **Player Statistics**

👤 Player: ${displayName}
📍 Payout Address: \`${targetUser.wallet_address}\`

🎮 **Game Stats:**
• Games Won: ${stats.games_won}
• Games Lost: ${stats.games_lost}
• Win Rate: ${winRate}%

🎰 **Lottery Stats:**
• Lottery Wins: ${stats.lottery_wins}
• Lottery Winnings: ${stats.lottery_winnings} WWT

Total Games Played: ${totalGames}
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error fetching stats: ${error.message}`);
            }
        });
        
        this.bot.command('lottery', async (ctx) => {
            try {
                const lotteryPool = await this.blockchain.getLotteryPool();
                
                const message = `
🎰 **Lottery Pool**

Current Pool: ${lotteryPool} WWT

🎲 **How it works:**
• Win a game, then roll for lottery
• Roll 7 or 11 = WIN THE ENTIRE POOL! 
• Pool resets to 0 after each win
• Pool grows with every game's 1% fee

Good luck! 🍀
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error checking lottery pool: ${error.message}`);
            }
        });
        
        this.bot.command('leaderboard', async (ctx) => {
            try {
                const leaderboard = await this.database.getLeaderboard(10);
                
                if (leaderboard.length === 0) {
                    return ctx.reply('📊 No players on leaderboard yet. Be the first to win a game!');
                }
                
                let message = '🏆 **LEADERBOARD** 🏆\n\n';
                
                leaderboard.forEach((player, index) => {
                    const rank = index + 1;
                    const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                    const username = player.username ? `@${player.username}` : `User${player.telegram_id.toString().slice(-4)}`;
                    const totalGames = player.games_won + player.games_lost;
                    const winRate = totalGames > 0 ? ((player.games_won / totalGames) * 100).toFixed(1) : 0;
                    
                    message += `${emoji} ${username}\n`;
                    message += `   🎮 ${player.games_won}W-${player.games_lost}L (${winRate}%)\n`;
                    if (player.lottery_wins > 0) {
                        message += `   🎰 ${player.lottery_wins} lottery wins\n`;
                    }
                    message += '\n';
                });
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error fetching leaderboard: ${error.message}`);
            }
        });
        
        // Scoreboard command (alias for leaderboard with username display)
        this.bot.command('scoreboard', async (ctx) => {
            try {
                const leaderboard = await this.database.getLeaderboard(10);
                
                if (leaderboard.length === 0) {
                    return ctx.reply('📊 No players on scoreboard yet. Be the first to win a game!');
                }
                
                let message = '🏆 **SCOREBOARD** 🏆\n\n';
                
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                
                leaderboard.forEach((player, index) => {
                    const medal = medals[index] || `${index + 1}️⃣`;
                    const displayName = player.username ? `@${player.username}` : `User${player.telegram_id.toString().slice(-4)}`;
                    const totalGames = player.games_won + player.games_lost;
                    const winRate = totalGames > 0 ? ((player.games_won / totalGames) * 100).toFixed(1) : 0;
                    
                    message += `${medal} **${displayName}**\n`;
                    message += `   🎮 Games Won: ${player.games_won}\n`;
                    message += `   📊 Win Rate: ${winRate}%\n`;
                    if (player.lottery_wins > 0) {
                        message += `   🎰 Lottery Wins: ${player.lottery_wins}\n`;
                    }
                    message += '\n';
                });
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error fetching scoreboard: ${error.message}`);
            }
        });

        // Jackpot command (shows current lottery pool)
        this.bot.command('jackpot', async (ctx) => {
            try {
                const lotteryPool = await this.blockchain.getLotteryPool();
                
                const message = `
🎰 **LOTTERY JACKPOT**

💰 Current Pool: **${lotteryPool} WWT**

� WIN any game to earn a lottery roll chance!
🍀 Roll 2 dice - if total = 7 or 11, win the jackpot!

*1% of each game's prize pool builds up this jackpot*
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error fetching jackpot: ${error.message}`);
            }
        });
        
        this.bot.command('join', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            // Get user's payout wallet from database
            const walletAddress = await this.database.getUserWallet(userId);
            if (!walletAddress) {
                return ctx.reply('❌ Please set your payout wallet first using /connect');
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please specify game ID: /join 123');
            }
            
            const gameId = args[1];
            
            try {
                const game = this.activeGames.get(gameId);
                if (!game) {
                    return ctx.reply('❌ Game not found. Make sure the game ID is correct.');
                }
                
                if (game.challenger === userId) {
                    return ctx.reply('❌ You cannot join your own game.');
                }
                
                if (game.status !== 'waiting') {
                    return ctx.reply('❌ This game is no longer available.');
                }
                
                // Update game with joiner info but don't start yet
                game.opponent = userId;
                game.opponentAddress = walletAddress;
                game.opponentName = ctx.from.username || `User${userId.toString().slice(-4)}`;
                game.status = 'pending_join';
                
                const contractAddress = await this.blockchain.getContractAddress();
                const message = `
🎮 **Ready to Join Game ${gameId}!**

💰 Buy-in: **${game.buyIn} $WILDW tokens**
🎯 Challenge: Beat ${game.challengerName}'s dice rolls!

🔒 **Please message me privately to fund this game securely**

Click the button below to continue in a private message:
                `;
                
                ctx.reply(message, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔒 Fund Join Privately', url: `https://t.me/${ctx.botInfo.username}?start=join_${gameId}` }
                        ]]
                    }
                });
                
                // Set timeout for join confirmation
                setTimeout(async () => {
                    const currentGame = this.activeGames.get(gameId);
                    if (currentGame && currentGame.status === 'pending_join') {
                        currentGame.status = 'waiting';
                        currentGame.opponent = null;
                        currentGame.opponentAddress = null;
                        currentGame.opponentName = null;
                        ctx.reply(`⏰ Join timeout for game ${gameId}. The game is available for others to join again.`);
                    }
                }, 10 * 60 * 1000); // 10 minutes
                
            } catch (error) {
                ctx.reply(`❌ Failed to join game: ${error.message}`);
            }
        });
        
        // Confirm join command (after manually sending tokens)
        this.bot.command('confirm_join', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            // Recommend private message for funding confirmations
            if (ctx.chat.type !== 'private') {
                return ctx.reply('🔒 **Privacy Recommended**\n\nFor security, please confirm your join funding in a private message.\n\n👆 Click my username above and send the command privately.', { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '💬 Message Bot Privately', url: `https://t.me/${ctx.botInfo.username}` }
                        ]]
                    }
                });
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please specify game ID: /confirm_join 123');
            }
            
            const gameId = args[1];
            
            try {
                const game = this.activeGames.get(gameId);
                if (!game) {
                    return ctx.reply('❌ Game not found. Make sure the game ID is correct.');
                }
                
                if (game.opponent !== userId) {
                    return ctx.reply('❌ You are not the player trying to join this game.');
                }
                
                if (game.status !== 'pending_join') {
                    return ctx.reply('❌ This game is not waiting for join confirmation.');
                }
                
                // Verify player has deposited the required tokens
                const depositBalance = await this.blockchain.getPlayerDeposit(game.opponentAddress);
                
                ctx.reply('🔍 Checking your deposit on the blockchain...');
                
                if (parseFloat(depositBalance) < game.buyIn) {
                    const message = `
❌ **Insufficient Deposit Detected**

💰 Required: ${game.buyIn} WWT
💰 Your Deposit: ${depositBalance} WWT
💰 Still Needed: ${game.buyIn - parseFloat(depositBalance)} WWT

**Please send the remaining tokens to:**
\`${this.blockchain.contractAddress}\`

⏰ Join expires in ${Math.round((game.createdAt + 10*60*1000 - Date.now()) / 60000)} minutes

🔄 Use \`/confirm_join ${gameId}\` again after sending tokens
                    `;
                    return ctx.reply(message, { parse_mode: 'Markdown' });
                }
                
                // ✅ Deposit verified! Join the blockchain game
                const joinResult = await this.blockchain.joinBlockchainGame(gameId, game.opponentAddress);
                
                // Update local game state
                game.status = 'active';
                game.joinTxHash = joinResult.txHash;
                
                ctx.reply(`✅ Successfully joined game ${gameId}! The dice battle begins! 🎲\n🔗 Tx: ${this.blockchain.formatTransactionUrl(joinResult.txHash)}`);
                await this.startGameRounds(gameId);
            } catch (error) {
                ctx.reply(`❌ Failed to confirm join: ${error.message}`);
            }
        });
        
        this.bot.command('games', (ctx) => {
            const availableGames = Array.from(this.activeGames.entries())
                .filter(([_, game]) => game.status === 'waiting')
                .slice(0, 10); // Show max 10 games
            
            if (availableGames.length === 0) {
                return ctx.reply('🔍 No available games. Create one with /create <amount>');
            }
            
            let message = '🎮 **Available Games:**\n\n';
            availableGames.forEach(([gameId, game]) => {
                message += `🆔 ID: \`${gameId}\`\n💰 Buy-in: ${game.buyIn} WWT\n👤 Creator: ${game.challengerName}\n\n`;
            });
            message += 'Join a game with: /join <game_id>';
            
            ctx.reply(message, { parse_mode: 'Markdown' });
        });
        
        this.bot.command('mygames', (ctx) => {
            const userId = ctx.from.id;
            const userGames = Array.from(this.activeGames.entries())
                .filter(([_, game]) => game.challenger === userId || game.opponent === userId);
            
            if (userGames.length === 0) {
                return ctx.reply('🔍 You have no active games. Create one with /create <amount>');
            }
            
            let message = '🎯 **Your Games:**\n\n';
            userGames.forEach(([gameId, game]) => {
                const isChallenger = game.challenger === userId;
                message += `🆔 ID: \`${gameId}\`\n💰 Buy-in: ${game.buyIn} WWT\n🎯 Status: ${game.status}\n`;
                message += `👤 Role: ${isChallenger ? 'Challenger' : 'Opponent'}\n\n`;
            });
            
            ctx.reply(message, { parse_mode: 'Markdown' });
        });
        
        this.bot.command('howtoplay', (ctx) => {
            const detailedInstructions = `
📖 **COMPLETE GAME GUIDE - WildWest Dice** 📖

**🪙 TOKEN REQUIREMENTS:**
• Only accepts $WILDW tokens on Base network
• Contract: 0x8129609E5303910464FCe3022a809fA44455Fe9A
• Get $WILDW from DEX or swap platforms

**⚙️ INITIAL SETUP:**
1. Set your payout wallet: \`/wallet <your_address>\`
2. Verify it's saved: \`/payout\`
3. You're ready to play!

**🎲 CREATING A GAME:**
1. \`/create <amount>\` (e.g., \`/create 100\`)
2. Send $WILDW tokens to the contract address
3. \`/confirm <gameId>\` to activate your game
4. Wait for another player to join

**🃏 JOINING A GAME:**
1. \`/games\` to see available games
2. \`/join <gameId>\` to join a game
3. Send matching $WILDW amount to contract
4. \`/confirm_join <gameId>\` to start playing

**🎯 GAMEPLAY MECHANICS:**
• **Best of 3 rounds** - first to win 2 rounds wins all
• **Each round:** Both players roll 2 dice simultaneously
• **Dice totals:** 2-12 (sum of both dice)
• **Higher total wins the round**

**🚨 SNAKE EYES (⚀ ⚀):**
• Both dice showing 1 = INSTANT GAME LOSS
• Exception: Both players roll snake eyes = 2 points each, continue

**💰 WINNING & PAYOUTS:**
• Winner gets 99% of total pot (e.g., 198 from 200 $WILDW)
• 1% fee goes to lottery jackpot
• Automatic payout to your wallet address

**🎰 LOTTERY SYSTEM:**
• WIN any game to earn a lottery roll chance!
• Roll 2 dice - if total = 7 or 11, WIN ENTIRE LOTTERY POOL
• Pool builds from all 1% game fees

**📊 EXAMPLE GAME:**
Player A creates 100 $WILDW game → Player B joins with 100 $WILDW
Total pot: 200 $WILDW
Round 1: A rolls [⚃⚁]=4, B rolls [⚄⚂]=7 → B wins
Round 2: A rolls [⚅⚃]=9, B rolls [⚂⚁]=3 → A wins  
Round 3: A rolls [⚅⚅]=12, B rolls [⚄⚄]=10 → A wins game!
A gets 198 $WILDW, 2 $WILDW to lottery

**🔒 SECURITY:**
• Smart contract escrow holds all funds
• No human intervention in payouts
• Provably fair dice using Telegram's system

Ready to gamble? Start with \`/create <amount>\`! 🎲
            `;
            
            ctx.reply(detailedInstructions, { parse_mode: 'Markdown' });
        });
        
        this.bot.command('contract', (ctx) => {
            const contractInfo = `
🪙 **$WILDW Token Contract Address** 🪙

**Contract Address:**
0x8129609E5303910464FCe3022a809fA44455Fe9A

**Network:** Base
**Symbol:** $WILDW
**Name:** WildWest

📋 **Easy Copy:** Tap the address above to copy it!
🔗 **Add to Wallet:** Use this address to add $WILDW to your wallet
💰 **Buy $WILDW:** Use DEX platforms to swap for $WILDW tokens

Ready to play? Get some $WILDW and use \`/create <amount>\`! 🎲
            `;
            
            ctx.reply(contractInfo, { parse_mode: 'Markdown' });
        });
        
        this.bot.command('help', (ctx) => {
            // Reuse the start command functionality
            const welcomeMessage = `
🎲 **WildWest Dice Bot** 🎲

Welcome to the ultimate dice gambling experience on Base!

🪙 **ONLY ACCEPTS $WILDW TOKENS** 🪙
Contract: 0x8129609E5303910464FCe3022a809fA44455Fe9A

**🎯 HOW THE GAME WORKS:**

**Game Setup:**
• Player 1 creates a game with a buy-in amount (e.g., 100 $WILDW)
• Player 2 joins by matching the same buy-in amount
• Both players deposit $WILDW tokens into the smart contract escrow

**Game Play (Best of 3 Rounds):**
• Each round: Both players roll 2 dice simultaneously
• Your dice total = Dice 1 + Dice 2 (range: 2-12)
• Higher total wins the round
• First to win 2 rounds wins the entire pot!

**🐍 SNAKE EYES RULE:**
• Rolling ⚀ ⚀ (both dice showing 1) = INSTANT LOSS
• Exception: If both players roll snake eyes in same round, game continues with 2 points each

**💰 PAYOUTS:**
• Winner takes 99% of the total pot (198 $WILDW from 200 $WILDW pot)
• 1% house fee goes to lottery jackpot pool
• Automatic payout to your registered wallet address

**🎰 LOTTERY BONUS:**
• Every winner gets a lottery chance after winning a game!
• Roll 7 or 11 total to WIN THE ENTIRE LOTTERY POOL!
• Lottery pool grows from all game fees

**Commands:**
/contract - Get $WILDW contract address for easy copying
/connect - Instructions to set payout wallet
/wallet <address> - Set your payout address (one-time setup)
/payout - View your current payout address
/create <amount> - Create new game (send $WILDW tokens)
/confirm <gameId> - Confirm game after sending $WILDW tokens
/join <gameId> - Join an existing game 
/confirm_join <gameId> - Confirm join after sending $WILDW tokens
/games - View available games
/mygames - View your active games
/stats [username] - View player statistics
/scoreboard - View top players leaderboard
/jackpot - Check current lottery jackpot amount
/lottery - View lottery details
/howtoplay - Complete detailed game guide
/help - Show this help message

**🎰 Lottery System:**
• 1% fee builds up jackpot pool
• Winners get lottery chance after every game win!
• Roll 7 or 11 total to win entire $WILDW pool!

💡 **One-time setup:** Set your payout address once and you're ready to play! 💰
💰 **Get $WILDW tokens on Base network to start gambling!**

🔒 **Privacy:** Payout addresses and funding are handled in private messages for security.
            `;
            
            ctx.reply(welcomeMessage);
        });

        // Add a general command error handler for invalid commands (PRIVATE MESSAGES ONLY)
        this.bot.on('text', (ctx) => {
            // Only respond to private messages to avoid group spam and rate limiting
            if (ctx.chat.type !== 'private') {
                return; // Ignore group/channel messages
            }
            
            const text = ctx.message.text;
            
            // Only handle messages that start with / but aren't valid commands
            if (text.startsWith('/') && !this.isValidCommand(text)) {
                const commandHelp = `
❌ **Unknown Command**

🤖 **Available Commands:**
/start - Get started and see all instructions
/contract - Get $WILDW contract address  
/howtoplay - Detailed game guide
/connect - Set up your payout wallet
/create <amount> - Create new game (example: /create 100)
/join <gameId> - Join a game (example: /join ABC123)
/games - View available games
/mygames - View your active games  
/stats - Check your statistics
/lottery - Check lottery pool
/help - Show help menu

💡 **Need help?** Use /howtoplay for detailed instructions!
                `;
                
                ctx.reply(commandHelp, { parse_mode: 'Markdown' });
            }
        });
    }

    isValidCommand(text) {
        const validCommands = [
            '/start', '/help', '/contract', '/howtoplay', '/connect', '/wallet', '/payout',
            '/create', '/confirm', '/join', '/confirm_join', '/games', '/mygames', 
            '/stats', '/lottery', '/jackpot', '/scoreboard', '/leaderboard'
        ];
        
        const command = text.split(' ')[0].toLowerCase();
        return validCommands.includes(command);
    }
    
    async handlePrivateFunding(ctx, gameId, type) {
        const userId = ctx.from.id;
        
        // Check if this is actually a private message
        if (ctx.chat.type !== 'private') {
            return ctx.reply('🔒 This funding operation must be done in a private message. Please start a private chat with me.');
        }
        
        try {
            const game = this.activeGames.get(gameId);
            if (!game) {
                return ctx.reply('❌ Game not found. It may have expired or been cancelled.');
            }
            
            // Verify user is authorized for this game
            if (type === 'create' && game.challenger !== userId) {
                return ctx.reply('❌ You are not the challenger of this game.');
            }
            if (type === 'join' && game.opponent !== userId) {
                return ctx.reply('❌ You are not authorized to join this game.');
            }
            
            const contractAddress = await this.blockchain.getContractAddress();
            const amount = game.buyIn;
            
            const message = `
🔒 **Private Funding for Game ${gameId}**

💰 Amount needed: **${amount} WWT**
🎮 Action: ${type === 'create' ? 'Create game' : 'Join game'}

**⚠️ STEP 1: Send tokens to contract**
Send exactly **${amount} WWT** to:
\`${contractAddress}\`

**⚠️ STEP 2: Confirm your ${type}**
After sending tokens, use: \`/${type === 'create' ? 'confirm' : 'confirm_join'} ${gameId}\`

🔗 Contract: ${this.blockchain.formatAddressUrl(contractAddress)}

⏱️ *You have ${type === 'create' ? '30' : '10'} minutes to complete both steps*

🔒 **Privacy:** This funding information is only visible to you in this private message.
            `;
            
            ctx.reply(message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            ctx.reply(`❌ Error retrieving funding information: ${error.message}`);
        }
    }
    
    setupCallbacks() {
        this.bot.action(/roll_dice_(.+)/, async (ctx) => {
            const gameId = ctx.match[1];
            const userId = ctx.from.id;
            
            await ctx.answerCbQuery();
            await this.handleDiceRoll(ctx, gameId, userId);
        });
        
        this.bot.action(/roll_lottery_(.+)/, async (ctx) => {
            const gameId = ctx.match[1];
            const userId = ctx.from.id;
            
            await ctx.answerCbQuery('Rolling lottery dice...');
            
            try {
                // First, send visual dice animations (2 dice)
                const dice1Message = await ctx.replyWithDice();
                const dice2Message = await ctx.replyWithDice();
                
                // Wait for dice animations to complete (4 seconds each)
                setTimeout(async () => {
                    const dice1Value = dice1Message.dice.value;
                    const dice2Value = dice2Message.dice.value;
                    const total = dice1Value + dice2Value;
                    
                    // Process lottery with visual dice results
                    const walletAddress = this.userWallets.get(userId);
                    
                    // Check if lottery win (7 or 11)
                    const isWinner = (total === 7 || total === 11);
                    
                    if (isWinner) {
                        // Call blockchain to process lottery win
                        const lotteryResult = await this.blockchain.rollLottery(gameId, walletAddress);
                        
                        const dice1Emoji = this.getDiceEmoji(dice1Value);
                        const dice2Emoji = this.getDiceEmoji(dice2Value);
                        
                        const message = `
🎰💰 **LOTTERY JACKPOT!** 💰🎰

${dice1Emoji} + ${dice2Emoji} = ${total}

🏆 YOU WON THE LOTTERY! 🏆
💰 Winnings: ${lotteryResult.winnings} WWT

🔗 Tx: ${this.blockchain.formatTransactionUrl(lotteryResult.txHash)}

Congratulations! The pool has been reset to 0.
                        `;
                        await ctx.reply(message, { parse_mode: 'Markdown' });
                    } else {
                        const dice1Emoji = this.getDiceEmoji(dice1Value);
                        const dice2Emoji = this.getDiceEmoji(dice2Value);
                        
                        const message = `
🎰 **Lottery Roll**

${dice1Emoji} + ${dice2Emoji} = ${total}

😢 No luck this time! You needed 7 or 11.

Better luck next time! The pool continues to grow...
                        `;
                        await ctx.reply(message, { parse_mode: 'Markdown' });
                    }
                }, 8000); // Wait 8 seconds for both dice animations
                
            } catch (error) {
                console.error('Lottery roll error:', error);
                await ctx.reply(`❌ Error rolling lottery: ${error.message}`);
            }
        });
    }
    
    getDiceEmoji(value) {
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value] || '🎲';
    }
    
    async getUserWallet(userId) {
        try {
            return await this.database.getUserWallet(userId);
        } catch (error) {
            console.error('Error getting user wallet:', error);
            return null;
        }
    }
    
    async createGame(userId, buyInAmount) {
        const gameId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        this.activeGames.set(gameId, {
            id: gameId,
            challenger: userId,
            challengerName: `User${userId.toString().slice(-4)}`,
            opponent: null,
            buyIn: buyInAmount,
            status: 'waiting',
            rounds: [],
            currentRound: 0,
            challengerScore: 0,
            opponentScore: 0,
            createdAt: Date.now()
        });
        
        return gameId;
    }
    
    async joinGame(userId, gameId) {
        const game = this.activeGames.get(gameId);
        
        if (!game) {
            throw new Error('Game not found');
        }
        
        if (game.challenger === userId) {
            throw new Error('Cannot join your own game');
        }
        
        if (game.status !== 'waiting') {
            throw new Error('Game is not available');
        }
        
        game.opponent = userId;
        game.opponentName = `User${userId.toString().slice(-4)}`;
        game.status = 'active';
        
        return true;
    }
    
    async startGameRounds(gameId) {
        const game = this.activeGames.get(gameId);
        if (!game) return;
        
        // Notify both players
        const challengerMessage = `
🎲 **Game ${gameId} Started!**

Round 1 of 3 - Your turn to roll!
        `;
        
        const opponentMessage = `
🎲 **Game ${gameId} Started!**

Waiting for ${game.challengerName} to roll...
        `;
        
        await this.bot.telegram.sendMessage(game.challenger, challengerMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🎲 Roll Dice', callback_data: `roll_dice_${gameId}` }
                ]]
            }
        });
        
        await this.bot.telegram.sendMessage(game.opponent, opponentMessage, {
            parse_mode: 'Markdown'
        });
    }
    
    async handleDiceRoll(ctx, gameId, userId) {
        // Use Telegram's built-in dice animation (roll 2 dice for each player)
        const dice1Result = await ctx.replyWithDice();
        const dice2Result = await ctx.replyWithDice();
        
        setTimeout(() => {
            const dice1Value = dice1Result.dice.value;
            const dice2Value = dice2Result.dice.value;
            this.processDiceRoll(gameId, userId, dice1Value, dice2Value);
        }, 4000); // Wait for dice animations to complete
    }
    
    async processDiceRoll(gameId, userId, dice1Value, dice2Value) {
        const game = this.activeGames.get(gameId);
        if (!game) return;
        
        const currentRound = game.currentRound;
        
        if (!game.rounds[currentRound]) {
            game.rounds[currentRound] = {};
        }
        
        const isChallenger = game.challenger === userId;
        const playerKey = isChallenger ? 'challenger' : 'opponent';
        
        // Store both dice values and total
        game.rounds[currentRound][playerKey] = {
            dice1: dice1Value,
            dice2: dice2Value,
            total: dice1Value + dice2Value,
            isSnakeEyes: dice1Value === 1 && dice2Value === 1
        };
        
        // Check if both players have rolled
        const round = game.rounds[currentRound];
        if (round.challenger !== undefined && round.opponent !== undefined) {
            await this.processRoundResults(gameId, currentRound);
        } else {
            // Wait for other player
            const waitingFor = isChallenger ? game.opponent : game.challenger;
            const waitingName = isChallenger ? game.opponentName : game.challengerName;
            
            await this.bot.telegram.sendMessage(waitingFor, 
                `🎲 Your turn to roll in game ${gameId}!`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🎲 Roll Dice', callback_data: `roll_dice_${gameId}` }
                        ]]
                    }
                });
        }
    }
    
    async processRoundResults(gameId, roundIndex) {
        const game = this.activeGames.get(gameId);
        const round = game.rounds[roundIndex];
        
        const challengerData = round.challenger;
        const opponentData = round.opponent;
        
        let roundResult = '';
        let challengerRoundScore = challengerData.total;
        let opponentRoundScore = opponentData.total;
        
        // Check for snake eyes (both dice = 1)
        if (challengerData.isSnakeEyes && opponentData.isSnakeEyes) {
            // Both rolled snake eyes - continue with 2 points each
            challengerRoundScore = 2;
            opponentRoundScore = 2;
            roundResult = '🐍🐍 Both rolled snake eyes! 2 points each, game continues!';
        } else if (challengerData.isSnakeEyes) {
            // Challenger loses immediately
            return await this.endGame(gameId, game.opponent, 'Snake eyes! 🐍🐍');
        } else if (opponentData.isSnakeEyes) {
            // Opponent loses immediately  
            return await this.endGame(gameId, game.challenger, 'Snake eyes! 🐍🐍');
        } else {
            const challengerDice1 = this.getDiceEmoji(challengerData.dice1);
            const challengerDice2 = this.getDiceEmoji(challengerData.dice2);
            const opponentDice1 = this.getDiceEmoji(opponentData.dice1);
            const opponentDice2 = this.getDiceEmoji(opponentData.dice2);
            
            roundResult = `Round ${roundIndex + 1} Results:
${game.challengerName}: ${challengerDice1} ${challengerDice2} = ${challengerData.total}
${game.opponentName}: ${opponentDice1} ${opponentDice2} = ${opponentData.total}`;
        }
        
        game.challengerScore += challengerRoundScore;
        game.opponentScore += opponentRoundScore;
        
        // Send round results to both players
        const message = `${roundResult}\n\nRunning Score:\n${game.challengerName}: ${game.challengerScore}\n${game.opponentName}: ${game.opponentScore}`;
        
        await this.bot.telegram.sendMessage(game.challenger, message);
        await this.bot.telegram.sendMessage(game.opponent, message);
        
        game.currentRound++;
        
        // Check if game is complete (3 rounds)
        if (game.currentRound >= 3) {
            const winner = game.challengerScore > game.opponentScore ? game.challenger : 
                          game.opponentScore > game.challengerScore ? game.opponent : null;
            
            if (winner) {
                await this.endGame(gameId, winner, 'Final score');
            } else {
                // Tie - continue to sudden death
                await this.startSuddenDeath(gameId);
            }
        } else {
            // Continue to next round
            await this.startNextRound(gameId);
        }
    }
    
    async startNextRound(gameId) {
        const game = this.activeGames.get(gameId);
        const roundNum = game.currentRound + 1;
        
        const message = `🎲 Round ${roundNum} - Your turn to roll!`;
        
        await this.bot.telegram.sendMessage(game.challenger, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🎲 Roll Dice', callback_data: `roll_dice_${gameId}` }
                ]]
            }
        });
    }
    
    async startSuddenDeath(gameId) {
        const game = this.activeGames.get(gameId);
        
        const message = `⚡ SUDDEN DEATH! Tied at ${game.challengerScore}-${game.opponentScore}!\nFirst to win a round takes all!`;
        
        await this.bot.telegram.sendMessage(game.challenger, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '⚡ Roll for Victory!', callback_data: `roll_dice_${gameId}` }
                ]]
            }
        });
        
        await this.bot.telegram.sendMessage(game.opponent, message);
    }
    
    async endGame(gameId, winnerId, reason) {
        const game = this.activeGames.get(gameId);
        const winnerName = winnerId === game.challenger ? game.challengerName : game.opponentName;
        const loserName = winnerId === game.challenger ? game.opponentName : game.challengerName;
        const winnerAddress = winnerId === game.challenger ? game.challengerAddress : game.opponentAddress;
        
        try {
            // Complete game on blockchain (admin pays gas)
            const completionResult = await this.blockchain.completeBlockchainGame(gameId, winnerAddress);
            
            // Check lottery pool
            const lotteryPool = await this.blockchain.getLotteryPool();
            
            const winMessage = `
🏆 **VICTORY!** 🏆

You won game ${gameId}!
Reason: ${reason}

💰 Winnings: ${completionResult.payout || (game.buyIn * 2 * 0.99)} WWT
🔗 Payout Tx: ${this.blockchain.formatTransactionUrl(completionResult.txHash)}

🎰 **Lottery Available!** 
Current Pool: ${lotteryPool} WWT
Roll 7 or 11 to win it all! 🎲
            `;
            
            const loseMessage = `
💔 **DEFEAT** 💔

${winnerName} won game ${gameId}
Reason: ${reason}

Better luck next time! 🎲
            `;
            
            await this.bot.telegram.sendMessage(winnerId, winMessage, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🎰 Roll Lottery!', callback_data: `roll_lottery_${gameId}` }
                    ]]
                }
            });
            
            await this.bot.telegram.sendMessage(winnerId === game.challenger ? game.opponent : game.challenger, loseMessage, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Blockchain completion error:', error);
            
            // Notify both players of the issue
            const errorMessage = `⚠️ Game ${gameId} completed but there was an issue processing the payout. Please contact support.`;
            await this.bot.telegram.sendMessage(winnerId, errorMessage);
            await this.bot.telegram.sendMessage(winnerId === game.challenger ? game.opponent : game.challenger, errorMessage);
        }
        
        // Keep game in memory briefly for lottery roll, will be cleaned up later
        setTimeout(() => {
            this.activeGames.delete(gameId);
        }, 300000); // 5 minutes to roll lottery
    }
    
    start() {
        console.log('🚀 Starting WildWest Dice Bot...');
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🤖 Bot: @${process.env.TELEGRAM_BOT_USERNAME || 'unknown'}`);
        
        this.bot.launch();
        console.log('✅ WildWest Dice Bot is running!');
        
        // Enable graceful stop
        process.once('SIGINT', () => {
            console.log('🛑 Shutting down bot (SIGINT)...');
            this.database.close();
            this.bot.stop('SIGINT');
        });
        process.once('SIGTERM', () => {
            console.log('🛑 Shutting down bot (SIGTERM)...');
            this.database.close();
            this.bot.stop('SIGTERM');
        });

        // Add error handlers to prevent crashes
        this.bot.catch((err, ctx) => {
            console.error('⚠️ Bot error:', err.message);
            if (err.response && err.response.error_code === 429) {
                console.log('🔄 Rate limited, waiting...');
                // Don't crash on rate limits, just log and continue
                return;
            }
            console.error('Full error:', err);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
            // Don't crash on unhandled rejections
        });

        process.on('uncaughtException', (error) => {
            console.error('⚠️ Uncaught Exception:', error);
            // Log but don't crash
        });
    }
}

// Create and start the bot
const bot = new DiceBotGame();
bot.start();
