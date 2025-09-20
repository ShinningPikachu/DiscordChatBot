const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager.js');
const productManager = require('../../repository/productManager.js');
const bagBoardService = require('../../services/bagBoardService.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-publish')
    .setDescription('List an item for sale')
    .addStringOption(opt =>
      opt
        .setName('name')
        .setDescription('Item name')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addNumberOption(opt =>
      opt
        .setName('price')
        .setDescription('Price in coins')
        .setRequired(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const products = await productManager.getUserProducts(interaction.user.id);
    const choices = [...new Set(products.map(p => p.name))];
    const filtered = choices
      .filter(name => name.toLowerCase().startsWith(String(focused).toLowerCase()))
      .slice(0, 25)
      .map(name => ({ name, value: name }));
    await interaction.respond(filtered);
  },

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const price = interaction.options.getNumber('price');

    const products = await productManager.getUserProducts(interaction.user.id);
    const item = products.find(product => product.name.toLowerCase() === name.toLowerCase());
    if (!item || item.quantity < 1) {
      return interaction.reply({ content: `You do not have any ${name} to sell.`, ephemeral: true });
    }

    await productManager.removeProductFromUser(interaction.user.id, {
      name: item.name,
      quantity: 1,
    });

    await bagBoardService
      .syncBagForUser(interaction.guild, interaction.user.id)
      .catch(error => console.error('Bag sync failed after market publish', error));

    const id = market.addListing(interaction.user.id, name, price);
    await interaction.reply(`Your item (#${id}) is now on the market!`);
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
