import { UnitModel } from '../models/UnitModel';

export const seedUnits = async () => {
    try {
        const defaultUnits = ['ml', 'gm', 'ltr', 'kg'];
        for (const unit of defaultUnits) {
            await UnitModel.updateOne(
                { unitName: unit },
                { $setOnInsert: { unitName: unit } },
                { upsert: true }
            );
        }
        console.log('Units seeded successfully');
    } catch (error) {
        console.error('Error seeding units:', error);
    }
};
