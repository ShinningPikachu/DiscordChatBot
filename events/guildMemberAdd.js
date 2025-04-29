const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guild = member.guild;

        try {
            // Retrieve the previously cached invites (from an earlier point in time)
            const cachedInvites = member.client.cachedInvites.get(guild.id);

            // Create a snapshot of the old invites so that changes in invite objects won't affect this copy
            const oldInvitesSnapshot = new Map();
            for (const [code, invite] of cachedInvites.entries()) {
                // Only store the properties you need (e.g., code and uses)
                oldInvitesSnapshot.set(code, { code: invite.code, uses: invite.uses });
            }

            // Fetch the latest invite data from the guild
            const newInvites = await guild.invites.fetch();

            // Determine which invite increased in usage by comparing to the snapshot
            const usedInvite = newInvites.find(invite => {
                const oldInvite = oldInvitesSnapshot.get(invite.code);
                return oldInvite && invite.uses > oldInvite.uses;
            });

            if (usedInvite) {
                // Output the invite link used by the member
                console.log(`User ${member.user.tag} joined using the invite link: ${usedInvite.url}`);
                
                // Mapping of invite codes to role names.
                // Customize these invite codes and role names to your own server's invites/roles.
                const inviteRoleMapping = {
                    "https://discord.gg/eCFf9FUGWS": "Team 1", // Example invite code for Team 1
                    "https://discord.gg/x8d8ptHHEz": "Team 2", // Example invite code for Team 2
                    "https://discord.gg/9mxjFrsG6T": "Team 3", // Example invite code for Team 3
                    "https://discord.gg/4j9aTcsD49": "Team 4",// Add additional mappings as needed.
                };

                // Look up the role name based on the used invite code.
                const roleName = inviteRoleMapping[usedInvite.url];
                if (roleName) {
                    // Locate the role within the guild by its name
                    const role = guild.roles.cache.find(r => r.name === roleName);
                    if (role) {
                        await member.roles.add(role);
                        console.log(`Assigned role "${roleName}" to ${member.user.tag}`);
                    } else {
                        console.error(`Role "${roleName}" not found in guild ${guild.name}`);
                    }
                } else {
                    console.log(`No role mapping defined for invite code: ${usedInvite.code}`);
                }
            } else {
                console.log(`No increase in invite usage detected for ${member.user.tag}`);
            }

            // Update the cache with the newly fetched invites for the next join event
            member.client.cachedInvites.set(guild.id, newInvites);
        } catch (error) {
            console.error(`Error processing guild member join event: ${error}`);
        }
    },
};
