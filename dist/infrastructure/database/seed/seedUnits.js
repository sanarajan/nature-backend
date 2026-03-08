"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUnits = void 0;
const UnitModel_1 = require("../models/UnitModel");
const seedUnits = async () => {
    try {
        const defaultUnits = ['ml', 'gm', 'ltr', 'kg'];
        for (const unit of defaultUnits) {
            await UnitModel_1.UnitModel.updateOne({ unitName: unit }, { $setOnInsert: { unitName: unit } }, { upsert: true });
        }
        console.log('Units seeded successfully');
    }
    catch (error) {
        console.error('Error seeding units:', error);
    }
};
exports.seedUnits = seedUnits;
