const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
  const res = await mongoose.connection.collection('users').updateMany(
    { phoneNumber: null },
    { $unset: { phoneNumber: "" } }
  );
  console.log('Cleaned up:', res);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
