// filepath: c:\Users\youar\Documents\GitHub\discord\events\ready.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Cache invites for all guilds
        client.cachedInvites = new Map();
        for (const [guildId, guild] of client.guilds.cache) {
            const invites = await guild.invites.fetch();
            client.cachedInvites.set(guildId, invites);
        }
    },
};