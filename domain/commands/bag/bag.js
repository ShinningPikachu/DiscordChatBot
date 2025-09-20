const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const productManager = require('../../repository/productManager.js');
const userManager = require('../../repository/userManager.js');

const { getUserProducts } = productManager;
const { getOrCreateUser } = userManager;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bag')
    .setDescription('View your bag')
    .addSubcommand(subcommand =>
      subcommand.setName('view').setDescription('View your bag content')
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const products = await getUserProducts(userId);
      const user = await getOrCreateUser(userId);

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}’s Bag`)
        .setColor(0x00AE86)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💰 Coins', value: `${user.coins}`, inline: false },
          { name: '📦 Products', value: '', inline: false },
        )
        .setTimestamp();

      if (products.length) {
        products.forEach(prod => {
          embed.addFields({ name: prod.name, value: `• Quantity: **${prod.quantity}**`, inline: true });
        });
      } else {
        embed.spliceFields(1, 1, { name: '📦 Products', value: '_Your bag is empty_', inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error executing /bag command:', error);
      await interaction.reply({ content: 'Something went wrong while fetching your bag.', ephemeral: true });
    }
  },
};

