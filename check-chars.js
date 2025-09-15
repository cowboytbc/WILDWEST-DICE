const fs = require('fs');

const content = fs.readFileSync('src/bot.js', 'utf8');
const lines = content.split('\n');

// Check lines around 81
for (let i = 78; i <= 85; i++) {
    if (lines[i]) {
        console.log(`Line ${i + 1}:`);
        console.log('Raw:', JSON.stringify(lines[i]));
        console.log('Chars:', [...lines[i]].map(c => c.charCodeAt(0)).join(' '));
        console.log('---');
    }
}