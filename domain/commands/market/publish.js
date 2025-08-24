import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import market from '../../repository/marketManager.js';
import productManager from '../../repository/productManager.js';


export const data = new SlashCommandBuilder()
  .setName('market-publish')
  .setDescription('List an item for sale')
  .addStringOption(opt =>
      opt.setName('name')
         .setDescription('Item name')
         .setRequired(true)
         .setAutocomplete(true)
    )
    .addNumberOption(opt =>
      opt.setName('price')
         .setDescription('Price in coins')
         .setRequired(true)
    );

export async function execute(interaction) {
    // Autocomplete suggestions for item names
    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused();
      const products = await productManager.getUserProducts(interaction.user.id);
      const choices = products.map(i => i.name);
      const filtered = choices
        .filter(name => name.toLowerCase().startsWith(focused.toLowerCase()))
        .slice(0, 25)
        .map(name => ({ name, value: name }));
      await interaction.respond(filtered);
      return;
    }

    // Main publish logic
    const name = interaction.options.getString('name');
    const price = interaction.options.getNumber('price');

    // Check user has the item
    const products = await productManager.getUserProducts(interaction.user.id);
    const item = products.find(
      i => i.name.toLowerCase() === name.toLowerCase()
    );
    if (!item || item.quantity < 1) {
      return interaction.reply({
        content: `❌ You don't have any **${name}** to sell.`,
        ephemeral: true
      });
    }

    // Add listing using the product's ID
    const listing = await market.addListing(interaction.user.id, item._id, price);

    await interaction.reply(`✅ Your item (#${listing.id}) is now on the market!`);
    await updateMarketBoard(interaction.client);
};

async function updateMarketBoard(client) {
  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  if (!boardChannelId || !boardMessageId) return;

  const channel = await client.channels.fetch(boardChannelId);
  const msg = await channel.messages.fetch(boardMessageId);

  const listings = await market.getListings();
  const embed = new EmbedBuilder()
    .setTitle('🛒 Market Board')
    .setDescription(
      listings.length
        ? listings
            .map(l => `#${l.id} • **${l.product.name}** – ${l.price} coins`)
            .join('\n')
        : '_No items on sale_'
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
}
