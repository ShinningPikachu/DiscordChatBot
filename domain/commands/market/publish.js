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

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const products = await productManager.getUserProducts(interaction.user.id);
  const choices = [...new Set(products.map(p => p.name))];
  const filtered = choices
    .filter(name => name.toLowerCase().startsWith(String(focused).toLowerCase()))
    .slice(0, 25)
    .map(name => ({ name, value: name }));
  await interaction.respond(filtered);
}

export async function execute(interaction) {
  const name = interaction.options.getString('name');
  const price = interaction.options.getNumber('price');

  const products = await productManager.getUserProducts(interaction.user.id);
  const item = products.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (!item || item.quantity < 1) {
    return interaction.reply({ content: `You don't have any ${name} to sell.`, ephemeral: true });
  }

  await productManager.removeProductFromUser(interaction.user.id, {
    name: item.name,
    quantity: 1,
  });

  const id = market.addListing(interaction.user.id, name, price);
  await interaction.reply(`✅ Your item (#${id}) is now on the market!`);
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
