const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager.js');
const productManager = require('../../repository/productManager.js');
const bagBoardService = require('../../services/bagBoardService.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-remove')
    .setDescription('Remove one of your market listings')
    .addIntegerOption(opt =>
      opt
        .setName('id')
        .setDescription('Listing ID to remove')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = String(interaction.options.getFocused() ?? '').toLowerCase();
    const listings = market.getListings();
    const mine = listings.filter(listing => listing.seller === interaction.user.id);

    const choices = mine
      .filter(listing => {
        if (!focused) return true;
        const idMatch = String(listing.id).startsWith(focused);
        const nameMatch = listing.name && listing.name.toLowerCase().includes(focused);
        return idMatch || nameMatch;
      })
      .slice(0, 25)
      .map(listing => ({
        name: `#${listing.id} - ${listing.name} - ${listing.price} coins`,
        value: listing.id,
      }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const listings = market.getListings();
    const item = listings.find(listing => listing.id === id);

    if (!item) {
      return interaction.reply({ content: `No item with ID #${id}.`, ephemeral: true });
    }
    if (item.seller !== interaction.user.id) {
      return interaction.reply({ content: 'You can only remove your own listings.', ephemeral: true });
    }

    market.removeListing(id);

    await productManager.addProductToUser(interaction.user.id, {
      name: item.name,
      quantity: 1,
    });

    await bagBoardService
      .syncBagForUser(interaction.guild, interaction.user.id)
      .catch(error => console.error('Bag sync failed after market remove', error));

    await interaction.reply({
      content: `Removed your listing #${id} (${item.name}). The item has been returned to your bag.`,
      ephemeral: true,
    });
    await updateMarketBoard(interaction);
  },
};

async function updateMarketBoard(interaction) {
  const guild = interaction.guild;
  if (!guild) return;

  const marketChannel = guild.channels.cache.find(
    channel => channel.name && channel.name.toLowerCase() === 'market' && channel.isTextBased(),
  );
  if (!marketChannel) return;

  const listings = market.getListings();
  const embed = new EmbedBuilder()
    .setTitle('Market Board')
    .setDescription(
      listings.length
        ? listings.map(listing => `#${listing.id} - **${listing.name}** - ${listing.price} coins`).join('\n')
        : '_No items on sale_',
    )
    .setTimestamp();

  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  try {
    if (boardChannelId && boardMessageId && boardChannelId === marketChannel.id) {
      const message = await marketChannel.messages.fetch(boardMessageId);
      await message.edit({ embeds: [embed] });
    } else {
      const message = await marketChannel.send({ embeds: [embed] });
      market.setBoard(marketChannel.id, message.id);
    }
  } catch (error) {
    console.error('Failed updating market board message', error);
    const message = await marketChannel.send({ embeds: [embed] });
    market.setBoard(marketChannel.id, message.id);
  }
}
