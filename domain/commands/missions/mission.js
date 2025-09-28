const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const missionManager = require('../../repository/missionManager.js');
const Mission = require('../../database/models/mission.js');
const userManager = require('../../repository/userManager.js');
const productManager = require('../../repository/productManager.js');
const bagBoardService = require('../../services/bagBoardService.js');

const TEAM_ROLE_NAMES = ['Team 1', 'Team 2', 'Team 3', 'Team 4'];
const DOC_TYPES = Mission.allowedDocumentTypes ? Mission.allowedDocumentTypes() : ['image', 'pdf', 'txt'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mission')
    .setDescription('Mission utilities for team members')
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Show all missions'),
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Get details about one mission')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Mission title')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub
        .setName('submit')
        .setDescription('Submit mission evidence')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Mission title')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addUserOption(option => option.setName('participant1').setDescription('Additional participant'))
        .addUserOption(option => option.setName('participant2').setDescription('Additional participant'))
        .addUserOption(option => option.setName('participant3').setDescription('Additional participant'))
        .addUserOption(option => option.setName('participant4').setDescription('Additional participant'))
        .addUserOption(option => option.setName('participant5').setDescription('Additional participant'))
        .addAttachmentOption(option => option.setName('doc1').setDescription('Required document #1'))
        .addAttachmentOption(option => option.setName('doc2').setDescription('Required document #2'))
        .addAttachmentOption(option => option.setName('doc3').setDescription('Required document #3'))
        .addAttachmentOption(option => option.setName('doc4').setDescription('Required document #4'))
        .addAttachmentOption(option => option.setName('doc5').setDescription('Required document #5')),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (!focused || focused.name !== 'title') {
      return;
    }
    const value = String(focused.value ?? '').toLowerCase();
    const missions = await missionManager.getAllMissions();
    const choices = missions
      .filter(mission => !value || mission.title.toLowerCase().includes(value))
      .slice(0, 25)
      .map(mission => ({ name: mission.title, value: mission.title }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      return handleList(interaction);
    }

    if (sub === 'info') {
      return handleInfo(interaction);
    }

    if (sub === 'submit') {
      return handleSubmit(interaction);
    }
  },
};

async function handleList(interaction) {
  const missions = await missionManager.getAllMissions();
  if (!missions.length) {
    return interaction.reply({ content: 'No missions available right now.', ephemeral: true });
  }

  const embed = new EmbedBuilder().setTitle('Active Missions').setColor(0x00ae86);
  missions.forEach(mission => {
    embed.addFields({
      name: mission.title,
      value: formatMissionSummary(mission),
    });
  });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInfo(interaction) {
  const title = interaction.options.getString('title');
  const mission = await missionManager.getMissionByTitle(title);
  if (!mission) {
    return interaction.reply({ content: `Mission **${title}** not found.`, ephemeral: true });
  }

  const docLabel = formatDocuments(mission);
  const embed = new EmbedBuilder()
    .setTitle(mission.title)
    .setDescription(mission.description)
    .setColor(0x00ae86)
    .addFields(
      { name: 'Participants required', value: `${mission.minParticipants}`, inline: true },
      { name: 'Same team', value: mission.requireSameTeam ? 'Yes' : 'No', inline: true },
      { name: 'Documents', value: docLabel, inline: false },
      { name: 'Rewards', value: formatRewards(mission), inline: false },
    );

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSubmit(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  const member = interaction.member;
  if (!isTeamMember(member)) {
    return interaction.reply({ content: 'Only Team 1-4 members can submit missions.', ephemeral: true });
  }

  const title = interaction.options.getString('title');
  const mission = await missionManager.getMissionByTitle(title);
  if (!mission) {
    return interaction.reply({ content: `Mission **${title}** not found.`, ephemeral: true });
  }

  const participantOptions = ['participant1', 'participant2', 'participant3', 'participant4', 'participant5'];
  const participantIds = new Set([interaction.user.id]);
  for (const option of participantOptions) {
    const user = interaction.options.getUser(option);
    if (user) {
      participantIds.add(user.id);
    }
  }

  const participants = Array.from(participantIds);

  const teams = new Map();
  const errors = [];

  for (const userId of participants) {
    try {
      const guildMember = await guild.members.fetch(userId);
      const teamName = getTeamName(guildMember);
      if (!teamName) {
        errors.push(`<@${userId}> is not part of Team 1-4.`);
      } else {
        teams.set(userId, teamName);
      }
    } catch (error) {
      errors.push(`Unable to find member <@${userId}> in this guild.`);
    }
  }

  if (participants.length < mission.minParticipants) {
    errors.push(`This mission needs at least ${mission.minParticipants} participants.`);
  }

  let unifiedTeam = null;
  if (mission.requireSameTeam && participants.length) {
    const teamValues = Array.from(teams.values());
    if (teamValues.length !== participants.length) {
      errors.push('All participants must belong to a team.');
    } else {
      unifiedTeam = teamValues[0];
      if (!teamValues.every(teamName => teamName === unifiedTeam)) {
        errors.push('All participants must belong to the same team.');
      }
    }
  }

  const attachmentOptions = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];
  const attachments = [];
  for (const option of attachmentOptions) {
    const attachment = interaction.options.getAttachment(option);
    if (attachment) {
      attachments.push(attachment);
    }
  }

  const documents = attachments.map(attachment => ({
    name: attachment.name,
    url: attachment.url,
    type: detectDocumentType(attachment),
  }));

  const requiredDocuments = [...mission.requiredDocuments];
  if (requiredDocuments.length && !documents.length) {
    errors.push('This mission requires documents. Please attach them to the command.');
  }

  const consumption = [...documents];
  for (const required of requiredDocuments) {
    const index = consumption.findIndex(doc => doc.type === required);
    if (index === -1) {
      errors.push(`Missing required document of type **${required}**.`);
    } else {
      consumption.splice(index, 1);
    }
  }

  if (documents.some(doc => doc.type === null)) {
    errors.push('One or more documents have an unsupported file type. Supported types: ' + DOC_TYPES.join(', ') + '.');
  }

  const status = errors.length ? 'rejected' : 'accepted';
  const baseReason = errors.join(' ');

  let rewardNotes = '';
  if (status === 'accepted') {
    const rewardResult = await awardRewards({
      guild,
      mission,
      participants,
    });
    if (rewardResult.errors.length) {
      rewardNotes = rewardResult.errors.join(' ');
    }
  }

  const finalReasonParts = [baseReason, rewardNotes].filter(Boolean);
  const finalReason = finalReasonParts.join(' ');

  await missionManager.recordSubmission({
    missionId: mission._id,
    participants,
    team: unifiedTeam,
    documents,
    status,
    reason: finalReason,
    submittedBy: interaction.user.id,
    rewardCoins: mission.rewardCoins,
    rewardItems: mission.rewardItems,
  });

  await sendLogMessage(guild, {
    mission,
    status,
    reason: finalReason,
    participants,
    documents,
    submittedBy: interaction.user.id,
    unifiedTeam,
    rewardSummary: formatRewards(mission),
    rewardNotes,
  });

  if (status === 'rejected') {
    return interaction.reply({ content: `Submission checked: **Rejected**. ${baseReason}`, ephemeral: true });
  }

  if (rewardNotes) {
    return interaction.reply({
      content: `Submission received, but some rewards could not be delivered. ${rewardNotes}`,
      ephemeral: true,
    });
  }

  return interaction.reply({ content: 'Submission received. Rewards delivered!', ephemeral: true });
}

function isTeamMember(member) {
  return member.roles.cache.some(role => TEAM_ROLE_NAMES.includes(role.name));
}

function getTeamName(member) {
  const role = member.roles.cache.find(r => TEAM_ROLE_NAMES.includes(r.name));
  return role ? role.name : null;
}

function detectDocumentType(attachment) {
  if (!attachment) return null;
  const contentType = String(attachment.contentType || '').toLowerCase();
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'text/plain') return 'txt';

  const ext = path.extname(attachment.name || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (['.txt', '.md', '.log'].includes(ext)) return 'txt';
  return null;
}

async function sendLogMessage(guild, payload) {
  const { mission, status, reason, participants, documents, submittedBy, unifiedTeam, rewardSummary, rewardNotes } = payload;
  const logChannel = guild.channels.cache.find(channel => channel.name && channel.name.toLowerCase() === 'log' && channel.isTextBased());
  if (!logChannel) {
    console.warn('Log channel not found in guild:', guild.id);
    return;
  }

  const statusEmoji = status === 'accepted' ? 'OK' : 'X';
  const embed = new EmbedBuilder()
    .setTitle(`${statusEmoji} Mission Submission - ${mission.title}`)
    .addFields(
      { name: 'Submitted by', value: `<@${submittedBy}>`, inline: true },
      { name: 'Participants', value: participants.map(id => `<@${id}>`).join(', '), inline: false },
      { name: 'Team', value: unifiedTeam || 'Mixed', inline: true },
      { name: 'Documents', value: documents.length ? documents.map(doc => `${doc.name} (${doc.type || 'unknown'})`).join('\n') : 'None', inline: false },
      { name: 'Rewards', value: rewardSummary || formatRewards(mission), inline: false },
      { name: 'Result', value: status.toUpperCase(), inline: true },
    )
    .setTimestamp();

  if (reason) {
    embed.addFields({ name: 'Notes', value: reason });
  }

  if (rewardNotes && rewardNotes !== reason) {
    embed.addFields({ name: 'Reward Notes', value: rewardNotes });
  }

  await logChannel.send({ embeds: [embed] });
}

function formatMissionSummary(mission) {
  const docLabel = formatDocuments(mission);
  return `Participants: ${mission.minParticipants}\nDocuments: ${docLabel}\nSame team: ${mission.requireSameTeam ? 'Yes' : 'No'}\nRewards: ${formatRewards(mission)}\n${mission.description}`;
}

function formatDocuments(mission) {
  return mission.requiredDocuments?.length ? mission.requiredDocuments.join(', ') : 'None';
}

function formatRewards(mission) {
  const parts = [];
  if (mission.rewardCoins && mission.rewardCoins > 0) {
    parts.push(`${mission.rewardCoins} coins each`);
  }
  if (mission.rewardItems?.length) {
    const items = mission.rewardItems.map(item => `${item.name} x${item.quantity}`).join(', ');
    parts.push(items);
  }
  return parts.length ? parts.join(' | ') : 'None';
}

async function awardRewards({ guild, mission, participants }) {
  const errors = [];
  const rewardCoins = mission.rewardCoins || 0;
  const rewardItems = Array.isArray(mission.rewardItems) ? mission.rewardItems : [];

  if (rewardCoins <= 0 && rewardItems.length === 0) {
    return { errors };
  }

  for (const userId of participants) {
    try {
      await userManager.getOrCreateUser(userId);

      if (rewardCoins > 0) {
        await userManager.incrementUserCoins(userId, rewardCoins);
      }

      for (const item of rewardItems) {
        await productManager.addProductToUser(userId, {
          name: item.name,
          quantity: item.quantity,
        });
      }

      await bagBoardService
        .syncBagForUser(guild, userId)
        .catch(error => console.error('Bag sync failed after mission reward', error));
    } catch (error) {
      console.error('Failed to award mission rewards', error);
      errors.push(`Could not deliver rewards to <@${userId}>.`);
    }
  }

  return { errors };
}
