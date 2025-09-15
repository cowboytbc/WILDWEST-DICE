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
            
            const welcomeMessage = `
🎲 **WildWest Dice Bot** 🎲

Welcome to the ultimate dice gambling experience on Base!

**How to play:**
• Roll dice 3 times (best of 3)
• Highest total score wins
• Snake eyes (🎲🎲) = instant loss
• If both roll snake eyes on same round, game continues and snake eyes = 2 points
• Winner takes all minus 1% house fee

**Commands:**
/connect - Instructions to set payout wallet
/wallet <address> - Set your payout address (one-time setup)
/payout - View your current payout address
/create <amount> - Create new game (manual token sending)
/confirm <gameId> - Confirm game after sending tokens
/join <gameId> - Join an existing game 
/confirm_join <gameId> - Confirm join after sending tokens
/games - View available games
/mygames - View your active games
/stats [username] - View player statistics
/scoreboard - View top players leaderboard
/jackpot - Check current lottery jackpot amount
/lottery - View lottery details
/help - Show this help message

**🎰 Lottery System:**
• 1% fee builds up jackpot pool
• Roll double 6s to trigger lottery
• Roll 7 or 11 total to win entire pool!

💡 **One-time setup:** Set your payout address once and you're ready to play! 💰

🔒 **Privacy:** Payout addresses and funding are handled in private messages for security.
            `;
            
            ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
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
💰 Buy-in: ${buyInAmount} WWT
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

🎲 Roll two 6s on any dice to trigger the lottery!
🍀 Roll 7 or 11 total to win the jackpot!

*1% of each game's prize pool builds up this jackpot*
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Error fetching jackpot: ${error.message}`);
            }
        });
        
        this.bot.command('create', async (ctx) => {
            const userId = ctx.from.id;
            const args = ctx.message.text.split(' ');
            
            if (!this.userWallets.has(userId)) {
                return ctx.reply('❌ Please connect your wallet first using /connect');
            }
            
            if (args.length < 2) {
                return ctx.reply('❌ Please specify buy-in amount: /create 100');
            }
            
            const buyInAmount = parseFloat(args[1]);
            if (isNaN(buyInAmount) || buyInAmount <= 0) {
                return ctx.reply('❌ Invalid buy-in amount. Must be a positive number.');
            }
            
            const walletAddress = this.userWallets.get(userId);
            
            try {
                // Check if player has enough deposited tokens
                const depositBalance = await this.blockchain.getPlayerDeposit(walletAddress);
                if (parseFloat(depositBalance) < buyInAmount) {
                    return ctx.reply(`❌ Insufficient deposited tokens. You have ${depositBalance} WWT deposited, need ${buyInAmount} WWT. Use /deposit to deposit more tokens.`);
                }
                
                const gameResult = await this.blockchain.createBlockchainGame(walletAddress, buyInAmount);
                const gameId = gameResult.gameId;
                
                // Store game in local state
                this.activeGames.set(gameId, {
                    id: gameId,
                    challenger: userId,
                    challengerAddress: walletAddress,
                    challengerName: `User${userId.toString().slice(-4)}`,
                    opponent: null,
                    opponentAddress: null,
                    buyIn: buyInAmount,
                    status: 'waiting',
                    rounds: [],
                    currentRound: 0,
                    challengerScore: 0,
                    opponentScore: 0,
                    createdAt: Date.now(),
                    blockchainTxHash: gameResult.txHash
                });
                
                const message = `
🎮 **Game Created!**

🆔 Game ID: \`${gameId}\`
💰 Buy-in: ${buyInAmount} WWT
🎯 Status: Waiting for opponent
🔗 Tx: ${this.blockchain.formatTransactionUrl(gameResult.txHash)}

Share this game ID with someone to challenge them!
They can join with: /join ${gameId}
                `;
                
                ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                ctx.reply(`❌ Failed to create game: ${error.message}`);
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

💰 Buy-in: **${game.buyIn} WWT**
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
        
        this.bot.command('help', (ctx) => {
            ctx.command('start')(ctx);
        });
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
                const walletAddress = this.userWallets.get(userId);
                const lotteryResult = await this.blockchain.rollLottery(gameId, walletAddress);
                
                const dice1Emoji = this.getDiceEmoji(lotteryResult.dice1);
                const dice2Emoji = this.getDiceEmoji(lotteryResult.dice2);
                const total = lotteryResult.dice1 + lotteryResult.dice2;
                
                if (lotteryResult.won) {
                    const message = `
🎰💰 **LOTTERY JACKPOT!** 💰🎰

${dice1Emoji} + ${dice2Emoji} = ${total}

🏆 YOU WON THE LOTTERY! 🏆
💰 Winnings: ${lotteryResult.winnings} WWT

🔗 Tx: ${this.blockchain.formatTransactionUrl(lotteryResult.txHash)}

Congratulations! The pool has been reset to 0.
                    `;
                    await ctx.editMessageText(message, { parse_mode: 'Markdown' });
                } else {
                    const message = `
🎰 **Lottery Roll**

${dice1Emoji} + ${dice2Emoji} = ${total}

😢 No luck this time! You needed 7 or 11.

Better luck next time! The pool continues to grow...
                    `;
                    await ctx.editMessageText(message, { parse_mode: 'Markdown' });
                }
            } catch (error) {
                await ctx.editMessageText(`❌ Lottery roll failed: ${error.message}`);
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
        // Use Telegram's built-in dice animation
        const diceResult = await ctx.replyWithDice();
        
        setTimeout(() => {
            this.processDiceRoll(gameId, userId, diceResult.dice.value);
        }, 4000); // Wait for dice animation to complete
    }
    
    async processDiceRoll(gameId, userId, diceValue) {
        const game = this.activeGames.get(gameId);
        if (!game) return;
        
        const currentRound = game.currentRound;
        
        if (!game.rounds[currentRound]) {
            game.rounds[currentRound] = {};
        }
        
        const isChallenger = game.challenger === userId;
        const playerKey = isChallenger ? 'challenger' : 'opponent';
        
        game.rounds[currentRound][playerKey] = diceValue;
        
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
        
        const challengerRoll = round.challenger;
        const opponentRoll = round.opponent;
        
        let roundResult = '';
        let challengerRoundScore = challengerRoll;
        let opponentRoundScore = opponentRoll;
        
        // Check for snake eyes (1,1)
        const challengerSnakeEyes = challengerRoll === 1;
        const opponentSnakeEyes = opponentRoll === 1;
        
        if (challengerSnakeEyes && opponentSnakeEyes) {
            // Both rolled snake eyes - continue with 2 points each
            challengerRoundScore = 2;
            opponentRoundScore = 2;
            roundResult = '🐍 Both rolled snake eyes! 2 points each, game continues!';
        } else if (challengerSnakeEyes) {
            // Challenger loses immediately
            return await this.endGame(gameId, game.opponent, 'Snake eyes!');
        } else if (opponentSnakeEyes) {
            // Opponent loses immediately  
            return await this.endGame(gameId, game.challenger, 'Snake eyes!');
        } else {
            roundResult = `Round ${roundIndex + 1} Results:\n${game.challengerName}: ${challengerRoll}\n${game.opponentName}: ${opponentRoll}`;
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
    }
}

// Create and start the bot
const bot = new DiceBotGame();
bot.start();