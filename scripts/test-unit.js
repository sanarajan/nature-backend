const mongoose = require('mongoose');

async function test() {
    await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
    
    const unitSchema = new mongoose.Schema({}, { strict: false });
    const Unit = mongoose.model('Unit', unitSchema, 'units');
    
    const u = await Unit.findOne({ _id: new mongoose.Types.ObjectId('699f42f0c93650e569fc32a8') });
    console.log(u);
    
    process.exit(0);
}

test().catch(console.error);
