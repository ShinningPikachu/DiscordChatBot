const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const productManager = require('../../repository/productManager.js');
const { addProductToUser, removeProductFromUser } = productManager;
const userManager = require('../../repository/userManager.js');
const { getOrCreateUser, updateUserCoins } = userManager;

const OWNER_ID = '396765398894379009'; // Replace with your Discord user ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bagadmin')
    .setDescription('Manage user bags (Owner only)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  .addSubcommand(subcommand =>
      subcommand
        .setName('additem')
        .setDescription('Add an item to a user bag')
        .addUserOption(option => option.setName('target').setDescription('User to add item to').setRequired(true))
        .addStringOption(option => option.setName('name').setDescription('Item name').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Item quantity').setRequired(true)))
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

      try {
        // Use your new Mongo method
        console.log(`Adding ${quantity} of ${name} to ${target.tag}'s bag`);
        const updatedProduct = await addProductToUser(target.id, { name, quantity });

        return interaction.reply({
          content: `✅ Added **${quantity}× ${name}** to ${target.tag}’s bag.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bag additem:', err);
        return interaction.reply({
          content: `❌ Could not add item: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'removeitem') {
      const target  = interaction.options.getUser('target');
      const name    = interaction.options.getString('name');
      const quantity= interaction.options.getInteger('quantity');

      try {
        const result = await removeProductFromUser(target.id, { name, quantity });
        // If it was fully deleted, result.quantity will be <= quantity passed in
        const verb = result.quantity <= 0 ? 'removed completely' : 'updated';
        return interaction.reply({
          content: `✅ ${verb.charAt(0).toUpperCase()+verb.slice(1)} **${name}** (–${quantity}) in ${target.tag}’s bag.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bag removeitem:', err);
        return interaction.reply({
          content: `❌ Could not remove item: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'setcoins') {
      const target = interaction.options.getUser('target');
      const coins  = interaction.options.getInteger('coins');

      try {
        // Ensure the user exists (creates with default if not)
        await getOrCreateUser(target.id);

        // Update coins in Mongo
        const updatedUser = await updateUserCoins(target.id, coins);

        return interaction.reply({
          content: `✅ Set **${target.tag}**'s coins to **${updatedUser.coins}**.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bag setcoins:', err);
        return interaction.reply({
          content: `❌ Could not set coins: ${err.message}`,
          ephemeral: true,
        });
      }
    }
  },
};
