const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager');
const { getUserBag, updateUserBag } = require('../../repository/bagManager');


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
      const bag = getUserBag(interaction.user.id);
      const choices = bag.items.map(i => i.name);
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
    const bag = getUserBag(interaction.user.id);
    const itemIndex = bag.items.findIndex(
      i => i.name.toLowerCase() === name.toLowerCase()
    );
    if (itemIndex === -1 || bag.items[itemIndex].quantity < 1) {
      return interaction.reply({
        content: `❌ You don't have any **${name}** to sell.`,
        ephemeral: true
      });
    }

    // Decrement quantity in bag and save
    bag.items[itemIndex].quantity -= 1;
    if (bag.items[itemIndex].quantity === 0) {
      bag.items.splice(itemIndex, 1);
    }
    updateUserBag(interaction.user.id, bag);

    // Add listing
    const id = market.addListing(interaction.user.id, name, price);

    await interaction.reply(`✅ Your item (#${id}) is now on the market!`);
    await updateMarketBoard(interaction.client);
};

async function updateMarketBoard(client) {
  const { boardChannelId, boardMessageId } = require('../../repository/marketManager').getBoardInfo();
  if (!boardChannelId || !boardMessageId) return;

  const channel = await client.channels.fetch(boardChannelId);
  const msg = await channel.messages.fetch(boardMessageId);

  const listings = require('../../marketManager').getListings();
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