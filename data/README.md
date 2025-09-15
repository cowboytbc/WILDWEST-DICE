# Data Directory

This directory contains the SQLite database files for the dice bot.

## Files:
- `bot.db` - Main database file containing:
  - User wallet connections
  - Game history
  - Lottery roll records
  - Player statistics

## Database Schema:

### users
- telegram_id (PRIMARY KEY)
- wallet_address
- username
- first_name  
- connected_at

### games
- game_id (PRIMARY KEY)
- challenger_telegram_id
- challenger_address
- opponent_telegram_id
- opponent_address
- buy_in
- status
- winner_telegram_id
- winner_address
- created_at
- completed_at
- blockchain_tx_hash
- lottery_rolled

### lottery_rolls
- id (PRIMARY KEY)
- game_id
- player_telegram_id
- player_address
- dice1, dice2, total
- won
- winnings
- rolled_at
- tx_hash

## Backup Recommendation:
Regularly backup the `bot.db` file to prevent data loss.