const mongoose = require('mongoose');

const ALLOWED_DOCUMENT_TYPES = ['image', 'pdf', 'txt'];

const rewardItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const missionSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true, trim: true },
  minParticipants: { type: Number, default: 1, min: 1 },
  requiredDocuments: {
    type: [String],
    validate: {
      validator: docs => docs.every(doc => ALLOWED_DOCUMENT_TYPES.includes(doc)),
      message: 'Invalid document type in requiredDocuments.',
    },
    default: [],
  },
  requireSameTeam: { type: Boolean, default: false },
  rewardCoins: { type: Number, default: 0, min: 0 },
  rewardItems: { type: [rewardItemSchema], default: [] },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

missionSchema.statics.allowedDocumentTypes = function () {
  return [...ALLOWED_DOCUMENT_TYPES];
};

module.exports = mongoose.model('Mission', missionSchema);
