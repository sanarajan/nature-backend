const mongoose = require('mongoose');
require('dotenv').config();
const { UserModel } = require('./src/infrastructure/database/models/UserModel');

async function testGoogleAuth() {
  await mongoose.connect('mongodb+srv://calicutwebs_db_user:7M6kMSk2e7kQCKPv@cluster0.y4qquty.mongodb.net/naturalayam?retryWrites=true&w=majority&appName=nature-backend');
  
  try {
    // 1. Create a dummy Google user
    const user1 = await UserModel.create({
      email: 'testgoogle1@example.com',
      displayName: 'Google User 1',
      googleId: 'google-id-12345',
      authProvider: 'google',
      verified: true
    });
    console.log('User 1 created successfully:', user1._id);
    
    // 2. Create another dummy Google user without phone number
    const user2 = await UserModel.create({
      email: 'testgoogle2@example.com',
      displayName: 'Google User 2',
      googleId: 'google-id-67890',
      authProvider: 'google',
      verified: true
    });
    console.log('User 2 created successfully:', user2._id);
    
    // Cleanup
    await UserModel.deleteOne({ _id: user1._id });
    await UserModel.deleteOne({ _id: user2._id });
    console.log('Test successful and cleaned up!');
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testGoogleAuth();
