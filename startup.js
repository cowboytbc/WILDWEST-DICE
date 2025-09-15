// Startup script with comprehensive error handling and validation
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting WildWest Dice Bot with enhanced error handling...');
console.log(`🌐 Node.js version: ${process.version}`);
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`🔧 Platform: ${process.platform}`);

// Check required environment variables
const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'CONTRACT_ADDRESS', 
    'WILDWEST_TOKEN_ADDRESS',
    'BASE_RPC_URL',
    'PRIVATE_KEY'
];

console.log('🔍 Checking environment variables...');
let missingVars = [];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`❌ Missing: ${varName}`);
    } else {
        console.log(`✅ Found: ${varName} = ${varName.includes('KEY') || varName.includes('TOKEN') ? '[HIDDEN]' : process.env[varName]}`);
    }
}

if (missingVars.length > 0) {
    console.error(`❌ STARTUP FAILED: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('💡 Ensure all environment variables are set on Render dashboard.');
    process.exit(1);
}

// Check if required files exist
const requiredFiles = [
    'src/bot.js',
    'src/database.js', 
    'src/blockchain.js'
];

console.log('🔍 Checking required files...');
for (const filePath of requiredFiles) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ STARTUP FAILED: Missing required file: ${filePath}`);
        process.exit(1);
    } else {
        console.log(`✅ Found: ${filePath}`);
    }
}

// Check node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ STARTUP FAILED: node_modules not found. Run npm install.');
    process.exit(1);
}

console.log('✅ All dependency checks passed');

// Handle uncaught exceptions and promise rejections
process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

// Load and start the bot with additional error handling
try {
    console.log('🚀 Loading bot module...');
    require('./src/bot.js');
    console.log('✅ Bot module loaded successfully');
} catch (error) {
    console.error('❌ STARTUP FAILED: Error loading bot:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}