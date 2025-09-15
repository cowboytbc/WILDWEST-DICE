const { ethers } = require('ethers');

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        // Contract ABI (Application Binary Interface)
        this.contractABI = [
            "function depositTokens(uint256 _amount) external",
            "function createGame(uint256 _buyIn) external returns (uint256 gameId)",
            "function joinGame(uint256 _gameId) external",
            "function completeGame(uint256 _gameId, address _winner) external",
            "function rollLottery(uint256 _gameId) external",
            "function cancelGame(uint256 _gameId) external",
            "function withdrawDeposits(uint256 _amount) external",
            "function expireGame(uint256 _gameId) external",
            "function getGame(uint256 _gameId) external view returns (tuple(address challenger, address opponent, uint256 buyIn, uint8 state, address winner, uint256 createdAt))",
            "function getAvailableGames() external view returns (uint256[] memory)",
            "function getPlayerDeposit(address _player) external view returns (uint256)",
            "function getPlayerStats(address _player) external view returns (tuple(uint256 gamesWon, uint256 gamesLost, uint256 totalWinnings, uint256 lotteryWins, uint256 lotteryWinnings))",
            "function getLotteryPool() external view returns (uint256)",
            "function isGameExpired(uint256 _gameId) external view returns (bool)",
            "function playerDeposits(address) external view returns (uint256)",
            "function playerStats(address) external view returns (uint256, uint256, uint256, uint256, uint256)",
            "function lotteryPool() external view returns (uint256)",
            "function wildWestToken() external view returns (address)",
            "function addGasETH() external payable",
            "event GameCreated(uint256 indexed gameId, address indexed challenger, uint256 buyIn)",
            "event GameJoined(uint256 indexed gameId, address indexed opponent)",
            "event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 payout, uint256 tax)",
            "event GameExpired(uint256 indexed gameId)",
            "event TokensDeposited(address indexed player, uint256 amount)",
            "event LotteryWin(address indexed winner, uint256 amount, uint8 dice1, uint8 dice2)",
            "event LotteryLoss(address indexed player, uint8 dice1, uint8 dice2)"
        ];
        
        // ERC20 ABI for token interactions
        this.tokenABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 value) returns (bool)",
            "function transferFrom(address from, address to, uint256 value) returns (bool)",
            "function approve(address spender, uint256 value) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function name() view returns (string)"
        ];
        
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        this.tokenAddress = process.env.WILDWEST_TOKEN_ADDRESS;
        
        if (this.contractAddress && this.tokenAddress) {
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
            this.token = new ethers.Contract(this.tokenAddress, this.tokenABI, this.provider);
        }
    }
    
    async validatePlayerCanDeposit(playerAddress, amount) {
        try {
            const amountWei = ethers.parseEther(amount.toString());
            
            // Check if player has enough tokens
            const balance = await this.token.balanceOf(playerAddress);
            if (balance < amountWei) {
                throw new Error(`Insufficient token balance. Required: ${amount} WWT`);
            }
            
            // Check allowance
            const allowance = await this.token.allowance(playerAddress, this.contractAddress);
            if (allowance < amountWei) {
                return {
                    canDeposit: false,
                    needsApproval: true,
                    amount: amount,
                    contractAddress: this.contractAddress,
                    message: `Please approve ${amount} WWT for the contract first.`
                };
            }
            
            return {
                canDeposit: true,
                amount: amount,
                contractAddress: this.contractAddress
            };
        } catch (error) {
            console.error('Deposit validation error:', error);
            throw error;
        }
    }
    
    async getPlayerDeposit(playerAddress) {
        try {
            const deposit = await this.contract.getPlayerDeposit(playerAddress);
            return ethers.formatEther(deposit);
        } catch (error) {
            console.error('Get player deposit error:', error);
            throw error;
        }
    }
    
    async rollLottery(gameId, playerAddress) {
        try {
            const tx = await this.contract.rollLottery(gameId);
            const receipt = await tx.wait();
            
            // Check for lottery events
            const lotteryWinEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'LotteryWin';
                } catch (e) {
                    return false;
                }
            });
            
            const lotteryLossEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'LotteryLoss';
                } catch (e) {
                    return false;
                }
            });
            
            if (lotteryWinEvent) {
                const parsed = this.contract.interface.parseLog(lotteryWinEvent);
                return {
                    txHash: receipt.hash,
                    won: true,
                    dice1: parsed.args.dice1,
                    dice2: parsed.args.dice2,
                    winnings: ethers.formatEther(parsed.args.amount)
                };
            } else if (lotteryLossEvent) {
                const parsed = this.contract.interface.parseLog(lotteryLossEvent);
                return {
                    txHash: receipt.hash,
                    won: false,
                    dice1: parsed.args.dice1,
                    dice2: parsed.args.dice2
                };
            }
            
            return { txHash: receipt.hash };
        } catch (error) {
            console.error('Lottery roll error:', error);
            throw error;
        }
    }
    
    async getPlayerStats(playerAddress) {
        try {
            const stats = await this.contract.getPlayerStats(playerAddress);
            return {
                gamesWon: stats.gamesWon.toString(),
                gamesLost: stats.gamesLost.toString(),
                totalWinnings: ethers.formatEther(stats.totalWinnings),
                lotteryWins: stats.lotteryWins.toString(),
                lotteryWinnings: ethers.formatEther(stats.lotteryWinnings)
            };
        } catch (error) {
            console.error('Get player stats error:', error);
            throw error;
        }
    }
    
    async getLotteryPool() {
        try {
            const pool = await this.contract.getLotteryPool();
            return ethers.formatEther(pool);
        } catch (error) {
            console.error('Get lottery pool error:', error);
            throw error;
        }
    }
    
    async isGameExpired(gameId) {
        try {
            return await this.contract.isGameExpired(gameId);
        } catch (error) {
            console.error('Check game expired error:', error);
            throw error;
        }
    }
    
    async expireGame(gameId) {
        try {
            const tx = await this.contract.expireGame(gameId);
            const receipt = await tx.wait();
            return { txHash: receipt.hash };
        } catch (error) {
            console.error('Expire game error:', error);
            throw error;
        }
    }
    
    async createBlockchainGame(challengerAddress, buyInAmount) {
        try {
            // Check if challenger has enough deposited tokens
            const playerDeposit = await this.getPlayerDeposit(challengerAddress);
            if (parseFloat(playerDeposit) < buyInAmount) {
                throw new Error(`Insufficient deposited tokens. You have ${playerDeposit} WWT deposited, need ${buyInAmount} WWT`);
            }
            
            // Create the game on blockchain (admin pays gas)
            const buyInWei = ethers.parseEther(buyInAmount.toString());
            const tx = await this.contract.createGame(buyInWei);
            const receipt = await tx.wait();
            
            // Extract game ID from event logs
            const gameCreatedEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'GameCreated';
                } catch (e) {
                    return false;
                }
            });
            
            if (gameCreatedEvent) {
                const parsed = this.contract.interface.parseLog(gameCreatedEvent);
                return {
                    gameId: parsed.args.gameId.toString(),
                    txHash: receipt.hash
                };
            }
            
            throw new Error('Game creation event not found');
        } catch (error) {
            console.error('Blockchain game creation error:', error);
            throw error;
        }
    }
    
    async joinBlockchainGame(gameId, opponentAddress) {
        try {
            // Get game details
            const gameData = await this.contract.getGame(gameId);
            const buyInAmount = ethers.formatEther(gameData.buyIn);
            
            // Check if opponent has enough deposited tokens
            const playerDeposit = await this.getPlayerDeposit(opponentAddress);
            if (parseFloat(playerDeposit) < parseFloat(buyInAmount)) {
                throw new Error(`Insufficient deposited tokens. You have ${playerDeposit} WWT deposited, need ${buyInAmount} WWT`);
            }
            
            // Join the game (admin pays gas)
            const tx = await this.contract.joinGame(gameId);
            const receipt = await tx.wait();
            
            return {
                txHash: receipt.hash,
                success: true
            };
        } catch (error) {
            console.error('Blockchain game join error:', error);
            throw error;
        }
    }
    
    async completeBlockchainGame(gameId, winnerAddress) {
        try {
            const tx = await this.contract.completeGame(gameId, winnerAddress);
            const receipt = await tx.wait();
            
            // Extract payout details from event logs
            const gameCompletedEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'GameCompleted';
                } catch (e) {
                    return false;
                }
            });
            
            if (gameCompletedEvent) {
                const parsed = this.contract.interface.parseLog(gameCompletedEvent);
                return {
                    txHash: receipt.hash,
                    winner: parsed.args.winner,
                    payout: ethers.formatEther(parsed.args.payout),
                    tax: ethers.formatEther(parsed.args.tax)
                };
            }
            
            return { txHash: receipt.hash };
        } catch (error) {
            console.error('Blockchain game completion error:', error);
            throw error;
        }
    }
    
    async cancelBlockchainGame(gameId) {
        try {
            const tx = await this.contract.cancelGame(gameId);
            const receipt = await tx.wait();
            
            return {
                txHash: receipt.hash,
                success: true
            };
        } catch (error) {
            console.error('Blockchain game cancellation error:', error);
            throw error;
        }
    }
    
    async getGameDetails(gameId) {
        try {
            const gameData = await this.contract.getGame(gameId);
            
            return {
                challenger: gameData.challenger,
                opponent: gameData.opponent,
                buyIn: ethers.formatEther(gameData.buyIn),
                state: gameData.state, // 0: WaitingForOpponent, 1: InProgress, 2: Completed, 3: Cancelled
                winner: gameData.winner,
                createdAt: new Date(Number(gameData.createdAt) * 1000)
            };
        } catch (error) {
            console.error('Get game details error:', error);
            throw error;
        }
    }
    
    async getAvailableGames() {
        try {
            const gameIds = await this.contract.getAvailableGames();
            const games = [];
            
            for (const gameId of gameIds) {
                const gameDetails = await this.getGameDetails(gameId.toString());
                games.push({
                    id: gameId.toString(),
                    ...gameDetails
                });
            }
            
            return games;
        } catch (error) {
            console.error('Get available games error:', error);
            throw error;
        }
    }
    
    async getTokenBalance(address) {
        try {
            const balance = await this.token.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Get token balance error:', error);
            throw error;
        }
    }
    
    async getTokenAllowance(ownerAddress, spenderAddress) {
        try {
            const allowance = await this.token.allowance(ownerAddress, spenderAddress);
            return ethers.formatEther(allowance);
        } catch (error) {
            console.error('Get token allowance error:', error);
            throw error;
        }
    }
    
    async getTokenInfo() {
        try {
            const [name, symbol, decimals] = await Promise.all([
                this.token.name(),
                this.token.symbol(),
                this.token.decimals()
            ]);
            
            return { name, symbol, decimals };
        } catch (error) {
            console.error('Get token info error:', error);
            throw error;
        }
    }
    
    generateApprovalMessage(amount) {
        return `To play, you need to approve the smart contract to spend your WWT tokens.
        
Send this transaction from your wallet:

**Contract Address:** \`${this.contractAddress}\`
**Amount:** ${amount} WWT
**Function:** approve

Or use this link: https://basescan.org/address/${this.contractAddress}#writeContract`;
    }
    
    async estimateGas(method, params) {
        try {
            const gasEstimate = await this.contract[method].estimateGas(...params);
            const gasPrice = await this.provider.getFeeData();
            
            return {
                gasLimit: gasEstimate,
                gasPrice: gasPrice.gasPrice,
                estimatedCost: ethers.formatEther(gasEstimate * gasPrice.gasPrice)
            };
        } catch (error) {
            console.error('Gas estimation error:', error);
            throw error;
        }
    }
    
    formatTransactionUrl(txHash) {
        const baseUrl = process.env.NETWORK === 'mainnet' ? 
            'https://basescan.org/tx/' : 
            'https://sepolia.basescan.org/tx/';
        
        return baseUrl + txHash;
    }
    
    formatAddressUrl(address) {
        const baseUrl = process.env.NETWORK === 'mainnet' ? 
            'https://basescan.org/address/' : 
            'https://sepolia.basescan.org/address/';
        
        return baseUrl + address;
    }
}

module.exports = BlockchainService;