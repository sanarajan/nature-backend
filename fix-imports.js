const fs = require('fs');
const file = 'd:/naturalayam/nature-backend/src/infrastructure/config/infrastructure.container.ts';
let content = fs.readFileSync(file, 'utf8');

// replace '../domain/' with '../../domain/'
let replaced = content.replace(/from\s+'\.\.\/domain\//g, "from '../../domain/");
// Also replace '../services/' with '../../application/services/'
replaced = replaced.replace(/from\s+'\.\.\/services\//g, "from '../../application/services/");

fs.writeFileSync(file, replaced);
console.log('Fixed imports in infrastructure.container.ts');
