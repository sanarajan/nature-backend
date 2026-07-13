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

// LoginUseCase.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/auth/LoginUseCase.ts', [
    { from: /from '\.\.\/\.\.\/constants\//g, to: "from '../../../constants/" }
]);

// RegisterUseCase.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/auth/RegisterUseCase.ts', [
    { from: /from '\.\.\/\.\.\/domain\//g, to: "from '../../../domain/" },
    { from: /from '\.\.\/\.\.\/constants\//g, to: "from '../../../constants/" },
    { from: /from '\.\.\/\.\.\/infrastructure\//g, to: "from '../../../infrastructure/" },
    { from: /from '\.\.\/interfaces\//g, to: "from '../../interfaces/auth/" }
]);

// VerifyEmailUseCase.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/auth/VerifyEmailUseCase.ts', [
    { from: /from '\.\.\/\.\.\/domain\//g, to: "from '../../../domain/" },
    { from: /from '\.\.\/\.\.\/infrastructure\//g, to: "from '../../../infrastructure/" },
    { from: /from '\.\.\/interfaces\//g, to: "from '../../interfaces/auth/" }
]);

// ProductUseCases.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/catalog/ProductUseCases.ts', [
    { from: /from '\.\.\/\.\.\/\.\.\/interface\/middlewares\/error\/AppError'/g, to: "from '../../../shared/utils/AppError'" }
]);

// UserOrderUseCases.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/catalog/UserOrderUseCases.ts', [
    { from: /from '\.\.\/\.\.\/\.\.\/interface\/middlewares\/error\/AppError'/g, to: "from '../../../shared/utils/AppError'" }
]);

// infrastructure.container.ts
replaceInFile('d:/naturalayam/nature-backend/src/infrastructure/config/infrastructure.container.ts', [
    { from: /from '\.\/database\/repositories/g, to: "from '../database/repositories" },
    { from: /from '\.\.\/\.\.\/domain\/repositories/g, to: "from '../../domain/repositories" },
    { from: /from '\.\.\/\.\.\/application\/services/g, to: "from '../../application/services" }
]);

// UserController.ts
replaceInFile('d:/naturalayam/nature-backend/src/interface/controllers/user/UserController.ts', [
    { from: /from '\.\.\/\.\.\/application\/usecases/g, to: "from '../../../application/usecases" }
]);

console.log('Fixes applied.');
