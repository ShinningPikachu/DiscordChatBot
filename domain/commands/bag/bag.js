import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import productManager from '../../repository/productManager.js';
import userManager from '../../repository/userManager.js';

const { getUserProducts } = productManager;
const { getOrCreateUser } = userManager;

export const data = new SlashCommandBuilder()
  .setName('bag')
  .setDescription('View your bag')
  .addSubcommand(subcommand => subcommand
    .setName('view')
    .setDescription('View your bag content'));

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const products = await getUserProducts(userId);
    const user = await getOrCreateUser(userId);


    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}’s Bag`)
      .setColor(0x00AE86)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        // Coins field at top, full‑width
        { name: '💰 Coins', value: `${user.coins}`, inline: false },
        // Products section title, full‑width
        { name: '📦 Products', value: '', inline: false }
      )
      .setTimestamp();

    if (products.length) {
      // one field per product
      products.forEach(prod => {
        embed.addFields({
          name: prod.name,
          value: `• Quantity: **${prod.quantity}**`,
          inline: true
        });
      });
    } else {
      // no items
      embed.spliceFields(1, 1, {
          name: '📦 Products',
          value: '_Your bag is empty_',
          inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error executing /bag command:', error);
    await interaction.reply({
      content: 'Something went wrong while fetching your bag.',
      ephemeral: true,
    });
  }
}
