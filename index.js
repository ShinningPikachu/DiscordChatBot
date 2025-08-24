const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./database/config.json');

const connectDB = require('./database/db'); // <-- Add this at the top

connectDB();

const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildInvites, 
		GatewayIntentBits.GuildMembers
	]
});
client.cooldowns = new Collection();
client.commands = new Collection();
const foldersPath = path.join(__dirname, '/domain/commands');
let commandFolders = fs.readdirSync(foldersPath);

commandFolders = ['bag', 'market'];
console.log(commandFolders);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	console.log(`Loading commands from folder: ${commandsPath}`);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	console.log(`Found command files: ${commandFiles}`);
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
    	console.log(`  • Found command file: ${filePath}`);
		const command = require(filePath);
		if (command?.data && command?.execute) {
			client.commands.set(command.data.name, command);
		} else {
			console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'domain/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);
