# WildWest Dice Bot

A Telegram dice gambling bot using WildWest tokens on Base blockchain with lottery system and persistent user data.

**Telegram Bot**: @WILDWESTDICE_bot  
**GitHub Repository**: [https://github.com/cowboytbc/WILDWEST-DICE](https://github.com/cowboytbc/WILDWEST-DICE)

## Features

- 🎲 Best of 3 dice rolls with snake eyes rules
- 💰 WildWest token wagering on Base
- 🎰 Lottery system - roll 7 or 11 to win accumulated fees
- 🏆 Persistent leaderboard and statistics with usernames
- 🔒 Smart contract escrow for security
- 💾 SQLite database for user data persistence
- ⚡ Real-time Telegram dice animations
- 🎯 Manual token system - players send tokens directly to contract
- 📊 Commands: /scoreboard and /jackpot for easy access

## Game Rules

1. **Setup**: Players set payout addresses, manually send tokens to contract
2. **Create Game**: Use `/create <amount>` and send tokens to contract address
3. **Join Game**: Use `/join <gameId>` and send matching tokens to contract
4. **Confirmation**: Use `/confirm` or `/confirm_join` to activate games
5. **Gameplay**: Each player rolls dice 3 times (best of 3)
6. **Scoring**: Highest total score wins
7. **Snake Eyes**: Rolling 1 = instant loss
8. **Special Rule**: If both roll snake eyes in same round, game continues and snake eyes = 2 points
9. **Payout**: Winner gets 99% sent to their registered payout address
10. **Lottery**: 1% fee goes to lottery pool, winners can roll for jackpot
11. **Expiry**: Games expire in 30 minutes if no opponent joins

## Lottery System

- **Entry**: Win any game to earn lottery roll
- **Roll**: 2 dice, need total of 7 or 11 to win
- **Prize**: Entire accumulated lottery pool (all 1% fees)
- **Reset**: Pool goes to 0 after each win
- **Odds**: ~22.2% chance to win (8/36 combinations)

## Installation

### Prerequisites
- Node.js 16+
- Base wallet with ETH for gas fees
- WildWest tokens
- Telegram Bot Token

### Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/cowboytbc/WILDWEST-DICE.git
cd WILDWEST-DICE
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your values:
# - TELEGRAM_BOT_TOKEN
# - PRIVATE_KEY (for contract deployment/management)
# - WILDWEST_TOKEN_ADDRESS
# - RPC_URL
```

3. **Deploy the smart contract:**
```bash
npm run deploy
```

4. **Start the bot:**
```bash
npm start
```

## Smart Contract

The `DiceGameEscrow.sol` contract handles:
- Token escrow during games
- Payout distribution with tax
- Game state management
- Security against reentrancy attacks

### Contract Functions
- `createGame(buyIn)` - Create new game
- `joinGame(gameId)` - Join existing game
- `completeGame(gameId, winner)` - Finalize game results

## Bot Commands

- `/start` - Welcome message and instructions
- `/connect` - Connect your Base wallet  
- `/wallet <address>` - Set wallet address
- `/deposit` - Deposit WILDW tokens to play
- `/balance` - Check deposited vs wallet token balance
- `/create <amount>` - Create game with buy-in
- `/join <gameId>` - Join existing game
- `/games` - View available games
- `/mygames` - View your active games
- `/stats [address]` - View player statistics
- `/lottery` - Check lottery pool size
- `/leaderboard` - View top players
- `/withdraw <amount>` - Withdraw unused tokens
- `/help` - Show help message

## Development

### Local Testing
```bash
# Run on testnet
NETWORK=base-sepolia npm run deploy
npm run dev
```

### Contract Verification
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> <WILDWEST_TOKEN_ADDRESS>
```

## Security Features

- ✅ ReentrancyGuard protection
- ✅ Ownable access control
- ✅ Input validation
- ✅ Safe token transfers
- ✅ Emergency withdrawal function

## Configuration

### Gas Settings
- Default gas limit: 500,000
- Recommended gas price: Standard Base fees

### Token Requirements
- Players need WildWest tokens for buy-ins
- Players need ETH for transaction fees
- Contract needs approval to spend tokens

## Deployment

### Mainnet Deployment
1. Ensure sufficient ETH for deployment
2. Set mainnet RPC in .env
3. Run: `npm run deploy`
4. Verify contract on BaseScan
5. Start bot and test with small amounts

### Testnet Deployment (Recommended First)
1. Get Sepolia ETH from faucet
2. Get test WildWest tokens
3. Set testnet RPC in .env
4. Deploy and test thoroughly

## Monitoring

The bot logs all game events and blockchain transactions. Monitor:
- Game creation and completion
- Token transfers and approvals
- Error messages and failed transactions
- Player wallet connections

## Support

For issues or questions:
1. Check transaction status on BaseScan
2. Verify token balances and approvals
3. Review bot logs for errors
4. Ensure wallet has sufficient ETH for gas

## License

MIT License - See LICENSE file for details.

---

**⚠️ Disclaimer**: This is gambling software. Use responsibly and in compliance with local laws.