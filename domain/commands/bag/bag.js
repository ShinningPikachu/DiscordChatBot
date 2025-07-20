const { SlashCommandBuilder } = require('discord.js');
const { getUserBag } = require('../../repository/bagManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bag')
    .setDescription('View your bag')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your bag content')),
  async execute(interaction) {
    const userBag = getUserBag(interaction.user.id);
    const itemsText = userBag.items.length > 0 
      ? userBag.items.map(item => `Name: ${item.name}, Quantity: ${item.quantity}, Quality: ${item.quality}`).join('\n')
      : 'No items';
    return interaction.reply({ content: `Your bag:\nCoins: ${userBag.coins}\nItems:\n${itemsText}`, ephemeral: true });
  },
};
