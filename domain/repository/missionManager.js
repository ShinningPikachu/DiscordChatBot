const Mission = require('../../database/models/mission.js');
const MissionSubmission = require('../../database/models/missionSubmission.js');

async function createMission({
  title,
  description,
  minParticipants,
  requiredDocuments,
  requireSameTeam,
  rewardCoins,
  rewardItems,
  createdBy,
}) {
  const mission = new Mission({
    title,
    description,
    minParticipants,
    requiredDocuments,
    requireSameTeam,
    rewardCoins,
    rewardItems,
    createdBy,
  });
  return mission.save();
}

async function deleteMission(title) {
  const mission = await Mission.findOneAndDelete({ title });
  if (mission) {
    await MissionSubmission.deleteMany({ mission: mission._id });
  }
  return mission;
}

async function getAllMissions() {
  return Mission.find({}).sort({ createdAt: -1 });
}

async function getMissionByTitle(title) {
  return Mission.findOne({ title });
}

async function recordSubmission({
  missionId,
  participants,
  team,
  documents,
  status,
  reason,
  submittedBy,
  rewardCoins,
  rewardItems,
}) {
  return MissionSubmission.create({
    mission: missionId,
    participants,
    team,
    documents,
    rewardCoins,
    rewardItems,
    status,
    reason,
    submittedBy,
  });
}

module.exports = {
  createMission,
  deleteMission,
  getAllMissions,
  getMissionByTitle,
  recordSubmission,
};
