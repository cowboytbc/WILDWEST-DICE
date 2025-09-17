const fs = require('fs');

// Read the bot.js file
let content = fs.readFileSync('src/bot.js', 'utf8');

// Replace all template literals that contain the contract address
content = content.replace(/`([^`]*0x8129609E5303910464FCe3022a809fA44455Fe9A[^`]*)`/g, (match, innerContent) => {
    // Convert template literal to regular string
    const escaped = innerContent.replace(/\n/g, '\\n').replace(/"/g, '\\"');
    return `"${escaped}"`;
});

console.log('Fixed template literals containing contract address');

// Write the fixed content back
fs.writeFileSync('src/bot.js', content, 'utf8');
console.log('File updated successfully');