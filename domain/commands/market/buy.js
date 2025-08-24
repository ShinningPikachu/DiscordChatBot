import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import market from '../../repository/marketManager.js';
import userManager from '../../repository/userManager.js';
import productManager from '../../repository/productManager.js';


export const data = new SlashCommandBuilder()
  .setName('market-buy')
  .setDescription('Buy an item from the market')
  .addIntegerOption(opt =>
    opt.setName('id').setDescription('Listing ID').setRequired(true));


export async function execute(interaction) {
    const id = interaction.options.getInteger('id');
    const listings = market.getListings();
    const item = listings.find(l => l.id === id);

    if (!item) {
      return interaction.reply({ content: `❌ No item with ID #${id}.`, ephemeral: true });
    }
    if (item.seller === interaction.user.id) {
      return interaction.reply({ content: `❌ You can’t buy your own item.`, ephemeral: true });
    }

    const buyer = await userManager.getOrCreateUser(interaction.user.id);
    if (buyer.coins < item.price) {
      return interaction.reply({ content: `❌ You need ${item.price} coins to buy this.`, ephemeral: true });
    }

    await userManager.updateUserCoins(interaction.user.id, buyer.coins - item.price);
    await productManager.addProductToUser(interaction.user.id, {
      name: item.name,
      quantity: 1,
      quality: 'Unknown',
    });

    const seller = await userManager.getOrCreateUser(item.seller);
    await userManager.updateUserCoins(item.seller, seller.coins + item.price);

    // Remove listing
    market.removeListing(id);
    await interaction.reply(`✅ You bought #${id} **${item.name}** for ${item.price} coins!`);
    await updateMarketBoard(interaction.client);
  }


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
