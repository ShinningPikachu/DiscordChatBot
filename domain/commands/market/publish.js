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
      const choices = products.map(p => ({
        name: `${p.name} (${p.quality})`,
        value: p._id.toString()
      }));
      const filtered = choices
        .filter(c => c.name.toLowerCase().startsWith(focused.toLowerCase()))
        .slice(0, 25);
      await interaction.respond(filtered);
      return;
    }

    // Main publish logic
    const input = interaction.options.getString('name');
    const price = interaction.options.getNumber('price');

    // Check user has the item by ID or name
    const products = await productManager.getUserProducts(interaction.user.id);
    const item = products.find(
      p =>
        p._id.toString() === input ||
        p.name.toLowerCase() === input.toLowerCase()
    );
    if (!item || item.quantity < 1) {
      return interaction.reply({
        content: '❌ You do not own that item.',
        ephemeral: true,
      });
    }

    // Add listing using the resolved product ID
    const listing = await market.addListing(
      interaction.user.id,
      item._id.toString(),
      price
    );

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
            .map(
              l =>
                `#${l.id} • **${l.product.name} (${l.product.quality})** – ${l.price} coins`
            )
            .join('\n')
        : '_No items on sale_'
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
}
