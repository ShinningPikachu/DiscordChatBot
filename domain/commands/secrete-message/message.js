const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userManager = require('../../repository/userManager.js');
const bagBoardService = require('../../services/bagBoardService.js');
const fs = require('node:fs/promises');
const path = require('node:path');

const usageFile = path.join(__dirname, '../../anonUsage.json');
const REVEAL_COST = 10;

async function loadUsageStore() {
  try {
    const raw = await fs.readFile(usageFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(usageFile, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    console.error('Failed to read anonymous usage log', error);
    return {};
  }
}

async function saveUsageStore(store) {
  await fs.writeFile(usageFile, JSON.stringify(store, null, 2), 'utf8');
}

async function getUsageFor(guildId, userId) {
  if (!guildId) return null;
  const store = await loadUsageStore();
  return store[guildId]?.[userId] ?? null;
}

async function setUsageFor(guildId, userId, dateKey) {
  if (!guildId) return;
  const store = await loadUsageStore();
  if (!store[guildId]) {
    store[guildId] = {};
  }
  store[guildId][userId] = dateKey;
  await saveUsageStore(store);
}

function getMadridTimestamp() {
  const now = new Date();
  const madridNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const dateKey = madridNow.toISOString().split('T')[0];
  return { madridNow, dateKey };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anonymous')
    .setDescription('Send an anonymous message to a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to receive the anonymous message')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The content of the anonymous message')
        .setRequired(true),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const anonymousText = interaction.options.getString('message');
    const senderId = interaction.user.id;

    if (targetUser.id === senderId) {
      return interaction.reply({ content: 'You cannot send an anonymous message to yourself.', ephemeral: true });
    }

    const isServerOwner = senderId === interaction.guild?.ownerId;
    let isAppOwner = false;
    try {
      await interaction.client.application.fetch();
      const owner = interaction.client.application.owner;
      if (owner) {
        if (owner.id && senderId === owner.id) isAppOwner = true;
        else if (owner.members && owner.members.some(member => member.id === senderId)) isAppOwner = true;
      }
    } catch {}

    const { madridNow, dateKey: todayKey } = getMadridTimestamp();
    if (!isServerOwner && !isAppOwner) {
      const hour = madridNow.getHours();
      if (hour < 21) {
        return interaction.reply({ content: 'You can only send anonymous messages after 21:00 (Europe/Madrid).', ephemeral: true });
      }
      const alreadyUsed = await getUsageFor(interaction.guildId, senderId);
      if (alreadyUsed === todayKey) {
        return interaction.reply({ content: 'You can only send one anonymous message per day.', ephemeral: true });
      }
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Anonymous Message')
      .setDescription(`**To:** ${targetUser.tag}\n**Message:** ${anonymousText}`)
      .setColor(0x3498db)
      .setTimestamp();

    const confirmButton = new ButtonBuilder()
      .setCustomId(`anonConfirm:${senderId}:${targetUser.id}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
      .setCustomId(`anonCancel:${senderId}:${targetUser.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    const replyMsg = await interaction.fetchReply();

    const filter = button =>
      button.user.id === senderId &&
      (button.customId === `anonConfirm:${senderId}:${targetUser.id}` || button.customId === `anonCancel:${senderId}:${targetUser.id}`);
    const collector = replyMsg.createMessageComponentCollector({ filter, max: 1, time: 5 * 60 * 1000 });

    collector.on('collect', async btnInteraction => {
      if (btnInteraction.customId === `anonCancel:${senderId}:${targetUser.id}`) {
        await btnInteraction.update({ content: 'Message cancelled.', embeds: [], components: [], ephemeral: true });
        return;
      }

      if (!isServerOwner && !isAppOwner) {
        const { dateKey } = getMadridTimestamp();
        await setUsageFor(interaction.guildId, senderId, dateKey);
      }

      const dmEmbed = new EmbedBuilder()
        .setTitle('You have received an anonymous message')
        .setDescription(anonymousText)
        .setTimestamp();
      const revealButton = new ButtonBuilder()
        .setCustomId(`revealSender:${senderId}`)
        .setLabel(`Reveal Sender (${REVEAL_COST} coins)`)
        .setStyle(ButtonStyle.Primary);
      const dmRow = new ActionRowBuilder().addComponents(revealButton);

      const dmChannel = await targetUser.createDM();
      const sentMessage = await dmChannel.send({ embeds: [dmEmbed], components: [dmRow] });

      await btnInteraction.update({ content: `Anonymous message sent to **${targetUser.tag}**.`, embeds: [], components: [], ephemeral: true });

      const filter2 = interactionInDM =>
        interactionInDM.customId === `revealSender:${senderId}` && interactionInDM.user.id === targetUser.id;
      const collector2 = sentMessage.createMessageComponentCollector({ filter: filter2, time: 10 * 60 * 1000 });
      collector2.on('collect', async dmInteraction => {
        const user = await userManager.getOrCreateUser(dmInteraction.user.id);
        if (user.coins < REVEAL_COST) {
          return dmInteraction.reply({
            content: `You need ${REVEAL_COST} coins to reveal the sender, but you only have ${user.coins} coins.`,
            ephemeral: true,
          });
        }

        const updated = await userManager.updateUserCoins(dmInteraction.user.id, user.coins - REVEAL_COST);
        if (interaction.guild) {
          await bagBoardService
            .syncBagForUser(interaction.guild, dmInteraction.user.id)
            .catch(error => console.error('Bag sync failed after anonymous reveal', error));
        }

        const sender = await interaction.client.users.fetch(senderId);
        await dmInteraction.reply({
          content: `This message was sent by **${sender.tag}**. You have been charged ${REVEAL_COST} coins. Remaining balance: ${updated.coins}.`,
          ephemeral: true,
        });

        const disabledButton = new ButtonBuilder()
          .setCustomId(`revealSender:${senderId}`)
          .setLabel(`Reveal Sender (${REVEAL_COST} coins)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);
        await sentMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButton)] });
        collector2.stop();
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Confirmation timed out.', embeds: [], components: [] });
      }
    });
  },
};
