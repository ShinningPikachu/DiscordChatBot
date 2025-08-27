// Simple in-memory market listing manager to match command usage
let boardInfo = { boardChannelId: null, boardMessageId: null };
let listings = [];
let nextId = 1;

function addListing(userId, name, price) {
  const listing = { id: nextId++, name, seller: userId, price };
  listings.push(listing);
  return listing.id;
}

function removeListing(listingId) {
  listings = listings.filter(l => l.id !== listingId);
}

function getListings() {
  return listings.slice();
}

function setBoard(channelId, messageId) {
  boardInfo.boardChannelId = channelId;
  boardInfo.boardMessageId = messageId;
}

function getBoardInfo() {
  return { ...boardInfo };
}

module.exports = {
  addListing,
  removeListing,
  getListings,
  setBoard,
  getBoardInfo,
};
