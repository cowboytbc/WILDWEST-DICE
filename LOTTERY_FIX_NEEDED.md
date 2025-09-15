# Lottery System Description Fixes

## Current WRONG descriptions that need to be fixed:
- "Roll ⚅ ⚅ (double 6s) to trigger lottery chance"  
- "Roll double 6s (⚅ ⚅) to trigger lottery"

## Should be CORRECT:
- "WIN games to earn lottery roll opportunities"

## The actual smart contract logic:
1. Players WIN games to earn lottery roll opportunities
2. When you win a game, you get to roll for the lottery  
3. Roll 7 or 11 total to win the entire lottery pool
4. NOT "double 6s trigger lottery" - that's completely wrong!

## Lines to fix in bot.js:
- Line 106: • Roll ⚅ ⚅ (double 6s) to trigger lottery chance
- Line 130: • Roll double 6s (⚅ ⚅) to trigger lottery
- Line 915: • Roll ⚅ ⚅ (double 6s) to trigger lottery chance  
- Line 939: • Roll double 6s (⚅ ⚅) to trigger lottery