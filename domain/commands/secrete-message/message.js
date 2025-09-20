const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userManager = require('../../repository/userManager.js');
const fs = require('fs');
const path = require('path');

// Usage tracking file for daily send limits
const usageFile = path.join(__dirname, '../../anonUsage.json');
function loadUsage() {
  if (!fs.existsSync(usageFile)) {
    fs.writeFileSync(usageFile, JSON.stringify({}));
    return {};
  }
  return JSON.parse(fs.readFileSync(usageFile));
}
function saveUsage(usage) {
  fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anonymous')
    .setDescription('Send an anonymous message to a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to receive the anonymous message').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('The content of the anonymous message').setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const anonymousText = interaction.options.getString('message');
    const senderId = interaction.user.id;

    // Prevent sending to oneself
    if (targetUser.id === senderId) {
      return interaction.reply({ content: '❌ You cannot send an anonymous message to yourself.', ephemeral: true });
    }

    // Check unlimited privileges: server owner or bot creator
    const isServerOwner = senderId === interaction.guild.ownerId;
    let isAppOwner = false;
    try {
      await interaction.client.application.fetch();
      const owner = interaction.client.application.owner;
      if (owner) {
        if (owner.id && senderId === owner.id) isAppOwner = true;
        else if (owner.members && owner.members.some(m => m.id === senderId)) isAppOwner = true;
      }
    } catch {}

    // Enforce daily + time restrictions for general users
    const now = new Date();
    const madridNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    if (!isServerOwner && !isAppOwner) {
      const hour = madridNow.getHours();
      if (hour < 21) {
        return interaction.reply({ content: '❌ You can only send anonymous messages after 21:00 (Europe/Madrid).', ephemeral: true });
      }
      const usage = loadUsage();
      const today = madridNow.toISOString().split('T')[0];
      if (usage[senderId] === today) {
        return interaction.reply({ content: '❌ You can only send one anonymous message per day.', ephemeral: true });
      }
    }

    // Show confirmation prompt
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Anonymous Message')
      .setDescription(`**To:** ${targetUser.tag}\n**Message:** ${anonymousText}`)
      .setColor(0x3498DB)
      .setTimestamp();

    const confirmButton = new ButtonBuilder().setCustomId(`anonConfirm:${senderId}:${targetUser.id}`).setLabel('Confirm').setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder().setCustomId(`anonCancel:${senderId}:${targetUser.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    const replyMsg = await interaction.fetchReply();

    const filter = btn => btn.user.id === senderId && (btn.customId === `anonConfirm:${senderId}:${targetUser.id}` || btn.customId === `anonCancel:${senderId}:${targetUser.id}`);
    const collector = replyMsg.createMessageComponentCollector({ filter, max: 1, time: 5 * 60 * 1000 });

    collector.on('collect', async btnInteraction => {
      if (btnInteraction.customId === `anonCancel:${senderId}:${targetUser.id}`) {
        await btnInteraction.update({ content: '❌ Message cancelled.', embeds: [], components: [], ephemeral: true });
        return;
      }

      // On confirm, record usage if needed
      if (!isServerOwner && !isAppOwner) {
        const usage = loadUsage();
        const today = madridNow.toISOString().split('T')[0];
        usage[senderId] = today;
        saveUsage(usage);
      }

      // Build DM embed and reveal button
      const dmEmbed = new EmbedBuilder().setTitle('You have received an anonymous message').setDescription(anonymousText).setTimestamp();
      const revealButton = new ButtonBuilder().setCustomId(`revealSender:${senderId}`).setLabel('Reveal Sender (5 coins)').setStyle(ButtonStyle.Primary);
      const dmRow = new ActionRowBuilder().addComponents(revealButton);

      // Send DM
      const dmChannel = await targetUser.createDM();
      const sentMessage = await dmChannel.send({ embeds: [dmEmbed], components: [dmRow] });

      // Acknowledge
      await btnInteraction.update({ content: `✅ Anonymous message sent to **${targetUser.tag}**.`, embeds: [], components: [], ephemeral: true });

      // Reveal sender collector same as before
      const filter2 = i => i.customId === `revealSender:${senderId}` && i.user.id === targetUser.id;
      const collector2 = sentMessage.createMessageComponentCollector({ filter: filter2, time: 10 * 60 * 1000 });
      collector2.on('collect', async i => {
        const user = await userManager.getOrCreateUser(i.user.id);
        if (user.coins < 5) {
          return i.reply({ content: `🚫 You need 5 coins to reveal the sender, but you only have ${user.coins} coins.`, ephemeral: true });
        }
        const updated = await userManager.updateUserCoins(i.user.id, user.coins - 5);
        const sender = await interaction.client.users.fetch(senderId);
        await i.reply({ content: `This message was sent by **${sender.tag}**. You have been charged 5 coins. Remaining balance: ${updated.coins}`, ephemeral: true });
        const disabledButton = new ButtonBuilder().setCustomId(`revealSender:${senderId}`).setLabel('Reveal Sender (5 coins)').setStyle(ButtonStyle.Primary).setDisabled(true);
        await sentMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButton)] });
        collector2.stop();
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: '⌛ Confirmation timed out.', embeds: [], components: [] });
      }
    });
  },
};
