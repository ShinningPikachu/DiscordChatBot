const bagBoards = new Map();

function getBoard(userId) {
  return bagBoards.get(userId) || null;
}

function setBoard(userId, channelId, messageId) {
  bagBoards.set(userId, { channelId, messageId });
}

function clearBoard(userId) {
  bagBoards.delete(userId);
}

module.exports = {
  getBoard,
  setBoard,
  clearBoard,
};
