const fs = require('fs');
const path = require('path');

// File to store bag data – you can adjust the filename/path as needed.
const bagFilePath = path.join(__dirname, 'bags.json');

console.log(bagFilePath);

// Load bags data from the file (if it doesn’t exist, initialize with an empty object)
function loadBags() {
	if (!fs.existsSync(bagFilePath)) {
		fs.writeFileSync(bagFilePath, JSON.stringify({}));
		return {};
	}
	return JSON.parse(fs.readFileSync(bagFilePath));
}

// Save the full bags object back to file
function saveBags(bags) {
	fs.writeFileSync(bagFilePath, JSON.stringify(bags, null, 2));
}

// Get the bag for a specific user – if none exists, initialize with default 100 coins and empty items array.
function getUserBag(userId) {
	const bags = loadBags();
	if (!bags[userId]) {
		bags[userId] = { coins: 100, items: [] };
		saveBags(bags);
	}
	return bags[userId];
}

// Update the bag data for a specific user
function updateUserBag(userId, bagData) {
	const bags = loadBags();
	bags[userId] = bagData;
	saveBags(bags);
}

module.exports = { getUserBag, updateUserBag };
