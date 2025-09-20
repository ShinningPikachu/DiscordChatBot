const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager.js');
const userManager = require('../../repository/userManager.js');

const OWNER_ID = '396765398894379009'; // Replace with your Discord user ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marketadmin')
    .setDescription('Admin tools for managing the market (Owner only)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('insert')
        .setDescription('Insert a product into the market without cost')
        .addStringOption(opt => opt.setName('name').setDescription('Product name').setRequired(true))
        .addNumberOption(opt => opt.setName('price').setDescription('Listing price in coins').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a product from the market by listing ID')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Listing ID to remove').setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('buy')
        .setDescription('Admin buys a listing: pays seller, removes listing')
        .addIntegerOption(opt => opt.setName('id').setDescription('Listing ID to buy').setRequired(true))
    ),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'This command is for the owner only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'insert') {
      const name = interaction.options.getString('name');
      const price = interaction.options.getNumber('price');
      const id = market.addListing(interaction.user.id, name, price);
      await interaction.reply({ content: `✅ Inserted #${id} ${name} for ${price} coins.`, ephemeral: true });
      await updateMarketBoard(interaction);
      return;
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const listings = market.getListings();
      const item = listings.find(l => l.id === id);
      if (!item) {
        return interaction.reply({ content: `No item with ID #${id}.`, ephemeral: true });
      }
      market.removeListing(id);
      await interaction.reply({ content: `🗑️ Removed listing #${id} (${item.name}).`, ephemeral: true });
      await updateMarketBoard(interaction);
      return;
    }

    if (sub === 'buy') {
      const id = interaction.options.getInteger('id');
      const listings = market.getListings();
      const item = listings.find(l => l.id === id);
      if (!item) {
        return interaction.reply({ content: `No item with ID #${id}.`, ephemeral: true });
      }
      const seller = await userManager.getOrCreateUser(item.seller);
      await userManager.updateUserCoins(item.seller, seller.coins + item.price);
      market.removeListing(id);
      await interaction.reply({ content: `🧾 Admin bought #${id} (${item.name}) for ${item.price} coins. Credited seller <@${item.seller}>.`, ephemeral: true });
      await updateMarketBoard(interaction);
      return;
    }
  },

  async autocomplete(interaction) {
    try {
      const sub = interaction.options.getSubcommand();
      if (sub !== 'remove') return;

      const focused = String(interaction.options.getFocused() ?? '').toLowerCase();
      const listings = market.getListings();

      const choices = listings
        .filter(l => !focused || String(l.id).startsWith(focused) || (l.name && l.name.toLowerCase().includes(focused)))
        .slice(0, 25)
        .map(l => ({ name: `#${l.id} — ${l.name} — ${l.price} coins`, value: l.id }));

      await interaction.respond(choices);
    } catch (_) {
      // ignore autocomplete errors
    }
  },
};

async function updateMarketBoard(interaction) {
  const guild = interaction.guild;
  if (!guild) return;

  const marketChannel = guild.channels.cache.find(c => c.name.toLowerCase() === 'market' && c.isTextBased());
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

