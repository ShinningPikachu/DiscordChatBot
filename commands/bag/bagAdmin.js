const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getUserBag, updateUserBag } = require('../../bagManager');
const OWNER_ID = '396765398894379009'; // Replace with your Discord user ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bagadmin')
    .setDescription('Manage user bags (Owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('additem')
        .setDescription('Add an item to a user bag')
        .addUserOption(option => option.setName('target').setDescription('User to add item to').setRequired(true))
        .addStringOption(option => option.setName('name').setDescription('Item name').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Item quantity').setRequired(true))
        .addStringOption(option =>
            option
                .setName('quality')
                .setDescription('Item quality')
                .setRequired(true)
                .addChoices(
                    { name: 'High', value: 'High' },
                    { name: 'Medium', value: 'Medium' },
                    { name: 'Low', value: 'Low' }
                )
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('removeitem')
        .setDescription('Remove an item from a user bag')
        .addUserOption(option => option.setName('target').setDescription('User to remove item from').setRequired(true))
        .addStringOption(option => option.setName('name').setDescription('Item name').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity to remove').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('setcoins')
        .setDescription('Set coins for a user bag')
        .addUserOption(option => option.setName('target').setDescription('User to set coins for').setRequired(true))
        .addIntegerOption(option => option.setName('coins').setDescription('New coin amount').setRequired(true))),
  async execute(interaction) {
    // Check that only the owner can execute these subcommands
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'This command is for the owner only.', ephemeral: true });
    }
    
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'additem') {
      const target = interaction.options.getUser('target');
      const name = interaction.options.getString('name');
      const quantity = interaction.options.getInteger('quantity');
      const quality = interaction.options.getString('quality');

      const bag = getUserBag(target.id);
      const existingItem = bag.items.find(item => item.name.toLowerCase() === name.toLowerCase());
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.quality = quality; // Update quality if needed
      } else {
        bag.items.push({ name, quantity, quality });
      }
      updateUserBag(target.id, bag);
      return interaction.reply({ content: `Added ${quantity} ${name}(s) (quality: ${quality}) to ${target.tag}'s bag.`, ephemeral: true });
    }

    if (subcommand === 'removeitem') {
      const target = interaction.options.getUser('target');
      const name = interaction.options.getString('name');
      const quantity = interaction.options.getInteger('quantity');

      const bag = getUserBag(target.id);
      const itemIndex = bag.items.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
      if (itemIndex === -1) {
        return interaction.reply({ content: `Item "${name}" not found in ${target.tag}'s bag.`, ephemeral: true });
      }
      if (bag.items[itemIndex].quantity < quantity) {
        return interaction.reply({ content: `Not enough quantity to remove. Current quantity: ${bag.items[itemIndex].quantity}`, ephemeral: true });
      }
      bag.items[itemIndex].quantity -= quantity;
      if (bag.items[itemIndex].quantity === 0) {
        bag.items.splice(itemIndex, 1);
      }
      updateUserBag(target.id, bag);
      return interaction.reply({ content: `Removed ${quantity} ${name}(s) from ${target.tag}'s bag.`, ephemeral: true });
    }

    if (subcommand === 'setcoins') {
      const target = interaction.options.getUser('target');
      const coins = interaction.options.getInteger('coins');

      const bag = getUserBag(target.id);
      bag.coins = coins;
      updateUserBag(target.id, bag);
      return interaction.reply({ content: `Set ${target.tag}'s coins to ${coins}.`, ephemeral: true });
    }
  },
};
