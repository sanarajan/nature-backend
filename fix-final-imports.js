const fs = require('fs');

function replaceInFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const { from, to } of replacements) {
        content = content.replace(from, to);
    }
    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
    }
}

// infrastructure.container.ts fixes
replaceInFile('d:/naturalayam/nature-backend/src/infrastructure/config/infrastructure.container.ts', [
    { from: /from '\.\.\/\.\.\/domain\/repositories\/IWishlistRepository'/g, to: "from '../../domain/repositories/ICartRepository'" },
    { from: /import { IInfluencerRepository } from '\.\.\/\.\.\/domain\/repositories\/IInfluencerRepository';\n/g, to: "" },
    { from: /import { InfluencerRepository } from '\.\/database\/repositories\/InfluencerRepository';\n/g, to: "" },
    { from: /container\.registerSingleton<IInfluencerRepository>\('IInfluencerRepository', InfluencerRepository\);\n/g, to: "" },
    { from: /from '\.\.\/\.\.\/application\/services\/EmailService'/g, to: "from '../services/EmailService'" },
    { from: /from '\.\.\/\.\.\/application\/services\/JwtService'/g, to: "from '../services/JwtService'" },
    { from: /from '\.\.\/\.\.\/application\/services\/PasswordService'/g, to: "from '../services/PasswordService'" },
    { from: /from '\.\.\/\.\.\/application\/services\/RazorpayService'/g, to: "from '../services/RazorpayService'" }
]);

console.log('Final fixes applied.');
