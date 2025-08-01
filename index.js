const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./database/config.json');

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
const commandFolders = fs.readdirSync(foldersPath);

const { MongoClient } = require('mongodb');

const url = "mongodb://127.0.0.1:27017";
const BDclient = new MongoClient(url);

const ConnectDB = async() => {
	try{
		await BDclient.connect();
		console.log("DB is Running...");
	}catch(e){
		console.log("error", e);
	}
}

ConnectDB()

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
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