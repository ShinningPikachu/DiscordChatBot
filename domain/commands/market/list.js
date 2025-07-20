const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-list')
    .setDescription('Show the current market board'),
  async execute(interaction) {
    const listings = market.getListings();
    const embed = new EmbedBuilder()
      .setTitle('🛒 Market Board')
      .setDescription(
        listings.length
          ? listings.map(l => `#${l.id} • **${l.name}** – ${l.price} coins`).join('\n')
          : '_No items on sale_'
      )
      .setTimestamp();

    // If no board exists yet, send and save it
    const { boardChannelId, boardMessageId } = market.getBoardInfo();
    if (!boardChannelId || !boardMessageId) {
      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      market.setBoard(interaction.channel.id, msg.id);
    } else {
      // otherwise just update the existing board
      await interaction.reply('Updating market board…');
      await updateMarketBoard(interaction.client);
    }
  }
};

async function updateMarketBoard(client) {
  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  const channel = await client.channels.fetch(boardChannelId);
  const msg = await channel.messages.fetch(boardMessageId);
  const listings = market.getListings();
  const embed = new EmbedBuilder()
    .setTitle('🛒 Market Board')
    .setDescription(
      listings.length
        ? listings.map(l => `#${l.id} • **${l.name}** – ${l.price} coins`).join('\n')
        : '_No items on sale_'
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
}
