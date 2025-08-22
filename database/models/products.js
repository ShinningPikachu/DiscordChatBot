const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:  { type: String, required: true },
  quantity: { type: Number, default: 1 },
  quality: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  }
});

module.exports = mongoose.model('Product', productSchema);
