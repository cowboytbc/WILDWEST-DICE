# Contributing to WildWest Dice Bot

Thank you for your interest in contributing to the WildWest Dice Bot project!

## Repository Information

- **GitHub**: [https://github.com/cowboytbc/WILDWEST-DICE](https://github.com/cowboytbc/WILDWEST-DICE)
- **Author**: cowboytbc
- **License**: MIT

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m "Add your feature"`
5. **Push to the branch**: `git push origin feature/your-feature-name`
6. **Open a Pull Request**

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/cowboytbc/WILDWEST-DICE.git
cd WILDWEST-DICE
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment template:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`

5. Compile contracts:
```bash
npx hardhat compile
```

6. Run the bot:
```bash
npm start
```

## Testing

- Test contract compilation: `npx hardhat compile`
- Test bot syntax: `node -c src/bot.js`
- Run tests: `npm test` (when tests are available)

## Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX improvements
- 🔒 Security enhancements

## Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing code patterns
- Test your changes thoroughly

## Issues

Report bugs and request features at: https://github.com/cowboytbc/WILDWEST-DICE/issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.