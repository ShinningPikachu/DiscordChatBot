const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager.js');
const userManager = require('../../repository/userManager.js');
const productManager = require('../../repository/productManager.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-buy')
    .setDescription('Buy an item from the market')
    .addIntegerOption(opt => opt.setName('id').setDescription('Listing ID').setRequired(true)),

  async execute(interaction) {
  const id = interaction.options.getInteger('id');
  const listings = market.getListings();
  const item = listings.find(l => l.id === id);

  if (!item) {
    return interaction.reply({ content: `No item with ID #${id}.`, ephemeral: true });
  }
  if (item.seller === interaction.user.id) {
    return interaction.reply({ content: `You can’t buy your own item.`, ephemeral: true });
  }

  const buyer = await userManager.getOrCreateUser(interaction.user.id);
  if (buyer.coins < item.price) {
    return interaction.reply({ content: `You need ${item.price} coins to buy this.`, ephemeral: true });
  }

  await userManager.updateUserCoins(interaction.user.id, buyer.coins - item.price);
  await productManager.addProductToUser(interaction.user.id, {
    name: item.name,
    quantity: 1,
  });

  const seller = await userManager.getOrCreateUser(item.seller);
  await userManager.updateUserCoins(item.seller, seller.coins + item.price);

  market.removeListing(id);
  await interaction.reply(`✅ You bought #${id} **${item.name}** for ${item.price} coins!`);
  await updateMarketBoard(interaction);
  },
};

async function updateMarketBoard(interaction) {
  const guild = interaction.guild;
  if (!guild) return;
  const marketChannel = guild.channels.cache.find(
    c => c.name.toLowerCase() === 'market' && c.isTextBased()
  );
  if (!marketChannel) return;

  const listings = market.getListings();
  const embed = new EmbedBuilder()
    .setTitle('🛒 Market Board')
    .setDescription(
      listings.length
        ? listings.map(l => `#${l.id} — **${l.name}** — ${l.price} coins`).join('\n')
        : '_No items on sale_'
    )
    .setTimestamp();

  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  try {
    if (boardChannelId && boardMessageId && boardChannelId === marketChannel.id) {
      const msg = await marketChannel.messages.fetch(boardMessageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const msg = await marketChannel.send({ embeds: [embed] });
      market.setBoard(marketChannel.id, msg.id);
    }
  } catch (_) {
    const msg = await marketChannel.send({ embeds: [embed] });
    market.setBoard(marketChannel.id, msg.id);
  }
}
