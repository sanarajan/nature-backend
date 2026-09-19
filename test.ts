import mongoose from 'mongoose';
import { OrderModel } from './src/infrastructure/database/models/OrderModel';

async function main() {
    try {
        await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
        const order = await OrderModel.findOne({ hasComboOffer: true }).sort({ createdAt: -1 });
        if (order) {
            console.log(JSON.stringify(order.orderedProducts, null, 2));
        } else {
            console.log("No combo order found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
main();
