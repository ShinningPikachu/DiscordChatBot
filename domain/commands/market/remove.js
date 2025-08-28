import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import market from '../../repository/marketManager.js';
import productManager from '../../repository/productManager.js';

export const data = new SlashCommandBuilder()
  .setName('market-remove')
  .setDescription('Remove one of your market listings')
  .addIntegerOption(opt =>
    opt
      .setName('id')
      .setDescription('Listing ID to remove')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction) {
  const focused = String(interaction.options.getFocused() ?? '').toLowerCase();
  const all = market.getListings();
  const mine = all.filter(l => l.seller === interaction.user.id);

  const choices = mine
    .filter(l =>
      !focused ||
      String(l.id).startsWith(focused) ||
      (l.name && l.name.toLowerCase().includes(focused))
    )
    .slice(0, 25)
    .map(l => ({ name: `#${l.id} — ${l.name} — ${l.price} coins`, value: l.id }));

  await interaction.respond(choices);
}

export async function execute(interaction) {
  const id = interaction.options.getInteger('id');
  const listings = market.getListings();
  const item = listings.find(l => l.id === id);

  if (!item) {
    return interaction.reply({ content: `No item with ID #${id}.`, ephemeral: true });
  }
  if (item.seller !== interaction.user.id) {
    return interaction.reply({ content: `You can only remove your own listings.`, ephemeral: true });
  }

  market.removeListing(id);
  // Return the item back to the user's bag
  await productManager.addProductToUser(interaction.user.id, {
    name: item.name,
    quantity: 1,
  });

  await interaction.reply({ content: `🗑️ Removed your listing #${id} (${item.name}). The item has been returned to your bag.`, ephemeral: true });
  await updateMarketBoard(interaction);
}

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
