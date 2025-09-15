// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DiceGameEscrow
 * @author cowboytbc
 * @notice Smart contract for WildWest Dice gambling bot with lottery system
 * @dev Handles token escrow, game management, and lottery mechanics
 * @custom:repository https://github.com/cowboytbc/WILDWEST-DICE
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DiceGameEscrow is ReentrancyGuard, Ownable {
    IERC20 public immutable wildWestToken;
    address public constant TAX_WALLET = 0x9360c80CA79409b5e315A9791bB0208C02D6ae32;
    uint256 public constant TAX_RATE = 100; // 1% = 100 basis points out of 10000
    uint256 public constant BASIS_POINTS = 10000;
    
    enum GameState { WaitingForOpponent, InProgress, Completed, Cancelled, Expired }
    
    struct Game {
        address challenger;
        address opponent;
        uint256 buyIn;
        GameState state;
        address winner;
        uint256 createdAt;
    }
    
    struct PlayerStats {
        uint256 gamesWon;
        uint256 gamesLost;
        uint256 totalWinnings;
        uint256 lotteryWins;
        uint256 lotteryWinnings;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(address => uint256) public playerDeposits; // Track how much each player has deposited
    mapping(address => PlayerStats) public playerStats; // Leaderboard stats
    uint256 public nextGameId;
    uint256 public lotteryPool; // Accumulated 1% fees for lottery
    uint256 public constant GAME_EXPIRY_TIME = 30 minutes;
    
    event GameCreated(uint256 indexed gameId, address indexed challenger, uint256 buyIn);
    event GameJoined(uint256 indexed gameId, address indexed opponent);
    event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 payout, uint256 tax);
    event GameCancelled(uint256 indexed gameId);
    event GameExpired(uint256 indexed gameId);
    event TokensDeposited(address indexed player, uint256 amount);
    event LotteryWin(address indexed winner, uint256 amount, uint8 dice1, uint8 dice2);
    event LotteryLoss(address indexed player, uint8 dice1, uint8 dice2);
    
    constructor(address _wildWestToken) {
        wildWestToken = IERC20(_wildWestToken);
    }
    
    // Players deposit WILDW tokens to the contract
    function depositTokens(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(wildWestToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        
        playerDeposits[msg.sender] += _amount;
        
        emit TokensDeposited(msg.sender, _amount);
    }
    
    // Players create games using their deposited tokens
    function createGame(uint256 _buyIn) external nonReentrant returns (uint256 gameId) {
        require(_buyIn > 0, "Buy-in must be greater than 0");
        require(playerDeposits[msg.sender] >= _buyIn, "Insufficient deposited tokens");
        
        // Deduct buy-in from player's deposit
        playerDeposits[msg.sender] -= _buyIn;
        
        gameId = nextGameId++;
        games[gameId] = Game({
            challenger: msg.sender,
            opponent: address(0),
            buyIn: _buyIn,
            state: GameState.WaitingForOpponent,
            winner: address(0),
            createdAt: block.timestamp
        });
        
        playerGames[msg.sender].push(gameId);
        
        emit GameCreated(gameId, msg.sender, _buyIn);
    }
    
    // Players join games using their deposited tokens
    function joinGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.challenger != address(0), "Game does not exist");
        require(game.state == GameState.WaitingForOpponent, "Game not available");
        require(msg.sender != game.challenger, "Cannot join own game");
        
        // Check if game has expired
        if (block.timestamp > game.createdAt + GAME_EXPIRY_TIME) {
            game.state = GameState.Expired;
            // Refund challenger's deposit
            playerDeposits[game.challenger] += game.buyIn;
            emit GameExpired(_gameId);
            revert("Game has expired");
        }
        
        require(playerDeposits[msg.sender] >= game.buyIn, "Insufficient deposited tokens");
        
        // Deduct buy-in from player's deposit
        playerDeposits[msg.sender] -= game.buyIn;
        
        game.opponent = msg.sender;
        game.state = GameState.InProgress;
        
        playerGames[msg.sender].push(_gameId);
        
        emit GameJoined(_gameId, msg.sender);
    }
    
    // Admin function - you pay gas to complete games and send winnings
    function completeGame(uint256 _gameId, address _winner) external onlyOwner nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(_winner == game.challenger || _winner == game.opponent, "Invalid winner");
        
        uint256 totalPot = game.buyIn * 2;
        uint256 tax = (totalPot * TAX_RATE) / BASIS_POINTS;
        uint256 payout = totalPot - tax;
        
        game.winner = _winner;
        game.state = GameState.Completed;
        
        // Add tax to lottery pool instead of sending to tax wallet
        lotteryPool += tax;
        
        // Update winner's stats
        address loser = _winner == game.challenger ? game.opponent : game.challenger;
        playerStats[_winner].gamesWon += 1;
        playerStats[_winner].totalWinnings += payout;
        playerStats[loser].gamesLost += 1;
        
        // Transfer winnings to winner (admin pays gas)
        require(wildWestToken.transfer(_winner, payout), "Payout transfer failed");
        
        emit GameCompleted(_gameId, _winner, payout, tax);
    }
    
    // Winner can roll for lottery after winning a game
    function rollLottery(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.Completed, "Game not completed");
        require(game.winner == msg.sender, "Only winner can roll lottery");
        require(lotteryPool > 0, "No lottery pool available");
        
        // Generate pseudo-random dice rolls (in production, use Chainlink VRF)
        uint256 randomness = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            _gameId
        )));
        
        uint8 dice1 = uint8((randomness % 6) + 1);
        uint8 dice2 = uint8(((randomness / 6) % 6) + 1);
        uint8 total = dice1 + dice2;
        
        if (total == 7 || total == 11) {
            // LOTTERY WIN!
            uint256 winnings = lotteryPool;
            lotteryPool = 0; // Reset pool
            
            // Update winner's lottery stats
            playerStats[msg.sender].lotteryWins += 1;
            playerStats[msg.sender].lotteryWinnings += winnings;
            playerStats[msg.sender].totalWinnings += winnings;
            
            // Transfer lottery winnings
            require(wildWestToken.transfer(msg.sender, winnings), "Lottery payout failed");
            
            emit LotteryWin(msg.sender, winnings, dice1, dice2);
        } else {
            // No win
            emit LotteryLoss(msg.sender, dice1, dice2);
        }
        
        // Mark that lottery was rolled for this game (prevent re-rolling)
        game.state = GameState.Expired; // Reuse expired state to mark as "lottery rolled"
    }
    
    function cancelGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.challenger == msg.sender, "Only challenger can cancel");
        require(game.state == GameState.WaitingForOpponent, "Can only cancel waiting games");
        
        game.state = GameState.Cancelled;
        
        // Refund challenger's deposit
        playerDeposits[game.challenger] += game.buyIn;
        
        emit GameCancelled(_gameId);
    }
    
    // Players can withdraw their unused deposited tokens
    function withdrawDeposits(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(playerDeposits[msg.sender] >= _amount, "Insufficient deposit balance");
        
        playerDeposits[msg.sender] -= _amount;
        require(wildWestToken.transfer(msg.sender, _amount), "Withdrawal failed");
    }
    
    // Admin function - you pay gas to complete games and send winnings
    function completeGameAsAdmin(uint256 _gameId, address _winner) external onlyOwner nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(_winner == game.challenger || _winner == game.opponent, "Invalid winner");
        
        uint256 totalPot = game.buyIn * 2;
        uint256 tax = (totalPot * TAX_RATE) / BASIS_POINTS;
        uint256 payout = totalPot - tax;
        
        game.winner = _winner;
        game.state = GameState.Completed;
        
        // Transfer tax to tax wallet (admin pays gas)
        require(wildWestToken.transfer(TAX_WALLET, tax), "Tax transfer failed");
        
        // Transfer winnings to winner (admin pays gas)
        require(wildWestToken.transfer(_winner, payout), "Payout transfer failed");
        
        emit GameCompleted(_gameId, _winner, payout, tax);
    }
    
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }
    
    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }
    
    function getPlayerDeposit(address _player) external view returns (uint256) {
        return playerDeposits[_player];
    }
    
    function getAvailableGames() external view returns (uint256[] memory availableGames) {
        uint256 count = 0;
        
        // First pass: count available games (not expired)
        for (uint256 i = 0; i < nextGameId; i++) {
            if (games[i].state == GameState.WaitingForOpponent && 
                block.timestamp <= games[i].createdAt + GAME_EXPIRY_TIME) {
                count++;
            }
        }
        
        // Second pass: populate array
        availableGames = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextGameId; i++) {
            if (games[i].state == GameState.WaitingForOpponent && 
                block.timestamp <= games[i].createdAt + GAME_EXPIRY_TIME) {
                availableGames[index] = i;
                index++;
            }
        }
    }
    
    // Leaderboard functions
    function getPlayerStats(address _player) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }
    
    function getLotteryPool() external view returns (uint256) {
        return lotteryPool;
    }
    
    // Admin function to add ETH for gas fees
    function addGasETH() external payable onlyOwner {
        // Function to receive ETH for gas fees
    }
    
    // Admin function to withdraw ETH
    function withdrawETH(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient ETH balance");
        payable(owner()).transfer(_amount);
    }
    
    // Function to check game expiry status
    function isGameExpired(uint256 _gameId) external view returns (bool) {
        Game memory game = games[_gameId];
        if (game.state != GameState.WaitingForOpponent) {
            return false;
        }
        return block.timestamp > game.createdAt + GAME_EXPIRY_TIME;
    }
    
    // Anyone can call to clean up expired games
    function expireGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.WaitingForOpponent, "Game not waiting");
        require(block.timestamp > game.createdAt + GAME_EXPIRY_TIME, "Game not expired yet");
        
        game.state = GameState.Expired;
        
        // Refund challenger's deposit
        playerDeposits[game.challenger] += game.buyIn;
        
        emit GameExpired(_gameId);
    }
    
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(wildWestToken), "Cannot withdraw game token");
        IERC20(_token).transfer(owner(), _amount);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}