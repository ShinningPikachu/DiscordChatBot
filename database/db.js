const mongoose = require('mongoose');

async function connectDB() {
    console.log('Connecting to MongoDB...');
    try {
        await mongoose.connect("mongodb://localhost:27017/discordBot", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');

    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = connectDB;
