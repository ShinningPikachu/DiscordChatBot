const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guild = member.guild;

    try {
      const cachedInvites = member.client.cachedInvites?.get(guild.id);
      if (!cachedInvites || !cachedInvites.size) {
        console.warn(`No cached invites available for guild ${guild.id}.`);
        return;
      }

      const oldInvitesSnapshot = new Map();
      for (const [code, invite] of cachedInvites.entries()) {
        oldInvitesSnapshot.set(code, { code: invite.code, uses: invite.uses });
      }

      const newInvites = await guild.invites.fetch();

      const usedInvite = newInvites.find(invite => {
        const oldInvite = oldInvitesSnapshot.get(invite.code);
        return oldInvite && invite.uses > oldInvite.uses;
      });

      if (usedInvite) {
        console.log(`User ${member.user.tag} joined using the invite link: ${usedInvite.url}`);

        const inviteRoleMapping = {
          'https://discord.gg/eCFf9FUGWS': 'Team 1',
          'https://discord.gg/x8d8ptHHEz': 'Team 2',
          'https://discord.gg/9mxjFrsG6T': 'Team 3',
          'https://discord.gg/4j9aTcsD49': 'Team 4',
        };

        const roleName = inviteRoleMapping[usedInvite.url];
        if (roleName) {
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

      member.client.cachedInvites.set(guild.id, newInvites);
    } catch (error) {
      console.error(`Error processing guild member join event: ${error}`);
    }
  },
};
