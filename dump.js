const mongoose = require('mongoose');
const OrderModel = require('./src/infrastructure/database/models/OrderModel').OrderModel;

async function main() {
    try {
        await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
        const order = await OrderModel.findOne({ hasComboOffer: true }).sort({ createdAt: -1 });
        const fs = require('fs');
        if (order) {
            fs.writeFileSync('order_dump.json', JSON.stringify(order, null, 2));
            console.log('Saved to order_dump.json');
        } else {
            console.log('No order found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
main();
