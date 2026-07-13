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

// Interfaces
replaceInFile('d:/naturalayam/nature-backend/src/application/interfaces/auth/ILoginUseCase.ts', [
    { from: /from '\.\.\/\.\.\/domain\/entities\/User'/g, to: "from '../../../domain/entities/User'" }
]);

replaceInFile('d:/naturalayam/nature-backend/src/application/interfaces/auth/IRegisterUseCase.ts', [
    { from: /from '\.\.\/\.\.\/domain\/entities\/User'/g, to: "from '../../../domain/entities/User'" }
]);

// AuthService.ts
replaceInFile('d:/naturalayam/nature-backend/src/application/services/AuthService.ts', [
    { from: /from '\.\.\/interfaces\/IAuthService'/g, to: "from '../interfaces/auth/IAuthService'" }
]);

// Admin AppError paths
const adminUsecases = [
    'AdminCategoryUseCases.ts',
    'AdminComboOfferUseCases.ts',
    'AdminOfferUseCases.ts',
    'AdminOrderUseCases.ts',
    'AdminProductUseCases.ts',
    'AdminShippingChargeUseCases.ts',
    'AdminSubcategoryUseCases.ts',
    'ShippingAgencyUseCases.ts'
];

for (const file of adminUsecases) {
    replaceInFile(`d:/naturalayam/nature-backend/src/application/usecases/admin/${file}`, [
        { from: /from '\.\.\/\.\.\/\.\.\/interface\/middlewares\/error\/AppError'/g, to: "from '../../../shared/utils/AppError'" }
    ]);
}

// AdminComboOfferUseCases.ts implicitly has any
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/admin/AdminComboOfferUseCases.ts', [
    { from: /items: data\.items\.map\(\(p\)/g, to: "items: data.items.map((p: any)" }
]);

// AdminProductUseCases.ts methods
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/admin/AdminProductUseCases.ts', [
    { from: /this\.categoryRepository\.findAllCategories\(\)/g, to: "this.categoryRepository.findAll()" },
    { from: /this\.subCategoryRepository\.findAllSubcategories\(\)/g, to: "this.subCategoryRepository.findAll()" }
]);

// LoginUseCase.ts imports
replaceInFile('d:/naturalayam/nature-backend/src/application/usecases/auth/LoginUseCase.ts', [
    { from: /from '\.\.\/interfaces\/ILoginUseCase'/g, to: "from '../../interfaces/auth/ILoginUseCase'" },
    { from: /from '\.\.\/\.\.\/domain\//g, to: "from '../../../domain/" }
]);

// infrastructure.container.ts wishlist and influencer paths
replaceInFile('d:/naturalayam/nature-backend/src/infrastructure/config/infrastructure.container.ts', [
    { from: /from '\.\.\/database\/repositories\/InfluencerRepository'/g, to: "from './database/repositories/InfluencerRepository'" }
]);

console.log('Fixes applied.');
