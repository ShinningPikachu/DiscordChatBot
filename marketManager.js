const fs = require('fs');
const path = require('path');
const marketFile = path.join(__dirname, 'market.json');

function loadMarket() {
  if (!fs.existsSync(marketFile)) {
    fs.writeFileSync(marketFile, JSON.stringify({
      listings: [],
      boardChannelId: null,
      boardMessageId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(marketFile, 'utf-8'));
}

function saveMarket(data) {
  fs.writeFileSync(marketFile, JSON.stringify(data, null, 2));
}

function addListing(userId, name, price) {
  const market = loadMarket();
  const id = market.listings.length > 0
    ? market.listings[market.listings.length - 1].id + 1
    : 1;
  market.listings.push({ id, seller: userId, name, price });
  saveMarket(market);
  return id;
}

function removeListing(id) {
  const market = loadMarket();
  market.listings = market.listings.filter(l => l.id !== id);
  saveMarket(market);
}

function getListings() {
  return loadMarket().listings;
}

function setBoard(channelId, messageId) {
  const market = loadMarket();
  market.boardChannelId = channelId;
  market.boardMessageId = messageId;
  saveMarket(market);
}

function getBoardInfo() {
  const { boardChannelId, boardMessageId } = loadMarket();
  return { boardChannelId, boardMessageId };
}

module.exports = {
  addListing, removeListing,
  getListings,
  setBoard, getBoardInfo
};
