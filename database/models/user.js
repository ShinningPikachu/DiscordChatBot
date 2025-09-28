const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true },
  role: { type: String, required: true, default: 'member' },
  coins: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
