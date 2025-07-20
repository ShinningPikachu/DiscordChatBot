const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager');
const { getUserBag, updateUserBag } = require('../../repository/bagManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-buy')
    .setDescription('Buy an item from the market')
    .addIntegerOption(opt =>
      opt.setName('id').setDescription('Listing ID').setRequired(true)),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const listings = market.getListings();
    const item = listings.find(l => l.id === id);

    if (!item) {
      return interaction.reply({ content: `❌ No item with ID #${id}.`, ephemeral: true });
    }
    if (item.seller === interaction.user.id) {
      return interaction.reply({ content: `❌ You can’t buy your own item.`, ephemeral: true });
    }

    const buyerBag = getUserBag(interaction.user.id);
    if (buyerBag.coins < item.price) {
      return interaction.reply({ content: `❌ You need ${item.price} coins to buy this.`, ephemeral: true });
    }

    // Transfer coins and add item to buyer's bag
    buyerBag.coins -= item.price;
    const existing = buyerBag.items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (existing) {
      existing.quantity += 1;
    } else {
      buyerBag.items.push({ name: item.name, quantity: 1, quality: 'Unknown' });
    }
    updateUserBag(interaction.user.id, buyerBag);

    const sellerBag = getUserBag(item.seller);
    sellerBag.coins += item.price;
    updateUserBag(item.seller, sellerBag);

    // Remove listing
    market.removeListing(id);
    await interaction.reply(`✅ You bought #${id} **${item.name}** for ${item.price} coins!`);
    await updateMarketBoard(interaction.client);
  }
};

async function updateMarketBoard(client) {
  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  if (!boardChannelId || !boardMessageId) return;
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
