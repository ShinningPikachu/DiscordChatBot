const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const productManager = require('../../repository/productManager.js');
const { addProductToUser, removeProductFromUser } = productManager;
const userManager = require('../../repository/userManager.js');
const { getOrCreateUser, updateUserCoins } = userManager;
const bagBoardService = require('../../services/bagBoardService.js');

const OWNER_ID = '396765398894379009';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bagadmin')
    .setDescription('Manage user bags (Owner only)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('additem')
        .setDescription('Add an item to a user bag')
        .addUserOption(option =>
          option.setName('target').setDescription('User to add item to').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('name').setDescription('Item name').setRequired(true),
        )
        .addIntegerOption(option =>
          option.setName('quantity').setDescription('Item quantity').setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('removeitem')
        .setDescription('Remove an item from a user bag')
        .addUserOption(option =>
          option.setName('target').setDescription('User to remove item from').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('name').setDescription('Item name').setRequired(true),
        )
        .addIntegerOption(option =>
          option.setName('quantity').setDescription('Quantity to remove').setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setcoins')
        .setDescription('Set coins for a user bag')
        .addUserOption(option =>
          option.setName('target').setDescription('User to set coins for').setRequired(true),
        )
        .addIntegerOption(option =>
          option.setName('coins').setDescription('New coin amount').setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'This command is for the owner only.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'additem') {
      const target = interaction.options.getUser('target');
      const name = interaction.options.getString('name');
      const quantity = interaction.options.getInteger('quantity');

      try {
        await addProductToUser(target.id, { name, quantity });
        await bagBoardService
          .syncBagForUser(interaction.guild, target.id)
          .catch(error => console.error('Bag sync failed after additem', error));

        return interaction.reply({
          content: `Added **${quantity} x ${name}** to ${target.tag}'s bag.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bagadmin additem:', err);
        return interaction.reply({
          content: `Could not add item: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'removeitem') {
      const target = interaction.options.getUser('target');
      const name = interaction.options.getString('name');
      const quantity = interaction.options.getInteger('quantity');

      try {
        const result = await removeProductFromUser(target.id, { name, quantity });
        const verb = result.quantity <= 0 ? 'removed completely' : 'updated';

        await bagBoardService
          .syncBagForUser(interaction.guild, target.id)
          .catch(error => console.error('Bag sync failed after removeitem', error));

        return interaction.reply({
          content: `${verb.charAt(0).toUpperCase() + verb.slice(1)} **${name}** (${quantity}) in ${target.tag}'s bag.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bagadmin removeitem:', err);
        return interaction.reply({
          content: `Could not remove item: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'setcoins') {
      const target = interaction.options.getUser('target');
      const coins = interaction.options.getInteger('coins');

      try {
        await getOrCreateUser(target.id);
        const updatedUser = await updateUserCoins(target.id, coins);

        await bagBoardService
          .syncBagForUser(interaction.guild, target.id)
          .catch(error => console.error('Bag sync failed after setcoins', error));

        return interaction.reply({
          content: `Set ${target.tag}'s coins to ${updatedUser.coins}.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('Error in /bagadmin setcoins:', err);
        return interaction.reply({
          content: `Could not set coins: ${err.message}`,
          ephemeral: true,
        });
      }
    }
  },
};
