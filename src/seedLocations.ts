import { CountryModel } from './infrastructure/database/models/CountryModel';
import { StateModel } from './infrastructure/database/models/StateModel';

export const seedLocations = async () => {
    try {
        let india = await CountryModel.findOne({ code: 'IN' });
        if (!india) {
            india = new CountryModel({ name: 'India', code: 'IN' });
            await india.save();
            console.log('Seeded Country: India');
        }

        const states = [
            { name: "Andhra Pradesh", code: "AP" },
            { name: "Arunachal Pradesh", code: "AR" },
            { name: "Assam", code: "AS" },
            { name: "Bihar", code: "BR" },
            { name: "Chhattisgarh", code: "CT" },
            { name: "Goa", code: "GA" },
            { name: "Gujarat", code: "GJ" },
            { name: "Haryana", code: "HR" },
            { name: "Himachal Pradesh", code: "HP" },
            { name: "Jharkhand", code: "JH" },
            { name: "Karnataka", code: "KA" },
            { name: "Kerala", code: "KL" },
            { name: "Madhya Pradesh", code: "MP" },
            { name: "Maharashtra", code: "MH" },
            { name: "Manipur", code: "MN" },
            { name: "Meghalaya", code: "ML" },
            { name: "Mizoram", code: "MZ" },
            { name: "Nagaland", code: "NL" },
            { name: "Odisha", code: "OR" },
            { name: "Punjab", code: "PB" },
            { name: "Rajasthan", code: "RJ" },
            { name: "Sikkim", code: "SK" },
            { name: "Tamil Nadu", code: "TN" },
            { name: "Telangana", code: "TG" },
            { name: "Tripura", code: "TR" },
            { name: "Uttar Pradesh", code: "UP" },
            { name: "Uttarakhand", code: "UT" },
            { name: "West Bengal", code: "WB" }
        ];

        const existingStates = await StateModel.countDocuments({ country_id: india._id });
        if (existingStates === 0) {
            const stateDocs = states.map(s => ({
                ...s,
                country_id: india._id
            }));
            await StateModel.insertMany(stateDocs);
            console.log(`Seeded ${stateDocs.length} states for India`);
        }
    } catch (err) {
        console.error('Error seeding locations:', err);
    }
};
