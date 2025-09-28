const mongoose = require('mongoose');

const missionSubmissionSchema = new mongoose.Schema({
  mission: { type: mongoose.Schema.Types.ObjectId, ref: 'Mission', required: true },
  participants: [{ type: String, required: true }],
  team: { type: String },
  documents: [
    {
      name: String,
      url: String,
      type: { type: String, enum: ['image', 'pdf', 'txt'] },
    },
  ],
  rewardCoins: { type: Number, default: 0, min: 0 },
  rewardItems: [
    {
      name: String,
      quantity: { type: Number, min: 1 },
    },
  ],
  status: { type: String, enum: ['accepted', 'rejected'], required: true },
  reason: { type: String },
  submittedBy: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MissionSubmission', missionSubmissionSchema);
