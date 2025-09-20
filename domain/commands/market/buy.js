const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const market = require('../../repository/marketManager.js');
const userManager = require('../../repository/userManager.js');
const productManager = require('../../repository/productManager.js');
const bagBoardService = require('../../services/bagBoardService.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-buy')
    .setDescription('Buy an item from the market')
    .addIntegerOption(opt =>
      opt
        .setName('id')
        .setDescription('Listing ID')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = String(interaction.options.getFocused() ?? '').toLowerCase();
      const listings = market.getListings();

      const choices = listings
        .filter(listing => {
          if (!focusedValue) return true;
          const idMatch = String(listing.id).startsWith(focusedValue);
          const nameMatch = listing.name && listing.name.toLowerCase().includes(focusedValue);
          return idMatch || nameMatch;
        })
        .slice(0, 25)
        .map(listing => ({
          name: `#${listing.id} - ${listing.name} - ${listing.price} coins`,
          value: listing.id,
        }));

      await interaction.respond(choices);
    } catch (error) {
      console.error('Error during /market-buy autocomplete:', error);
    }
  },

  async execute(interaction) {
    const listings = market.getListings();

    if (!listings.length) {
      return interaction.reply({
        content: 'There are no items for sale right now.',
        embeds: [buildMarketEmbed(listings)],
        ephemeral: true,
      });
    }

    const id = interaction.options.getInteger('id');
    const item = listings.find(listing => listing.id === id);

    if (!item) {
      return interaction.reply({
        content: `No item with ID #${id}.`,
        embeds: [buildMarketEmbed(listings)],
        ephemeral: true,
      });
    }

    if (item.seller === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot buy your own item.',
        embeds: [buildMarketEmbed(listings)],
        ephemeral: true,
      });
    }

    const buyer = await userManager.getOrCreateUser(interaction.user.id);
    if (buyer.coins < item.price) {
      return interaction.reply({
        content: `You need ${item.price} coins to buy this.`,
        embeds: [buildMarketEmbed(listings)],
        ephemeral: true,
      });
    }

    await userManager.updateUserCoins(interaction.user.id, buyer.coins - item.price);
    await productManager.addProductToUser(interaction.user.id, {
      name: item.name,
      quantity: 1,
    });

    const seller = await userManager.getOrCreateUser(item.seller);
    await userManager.updateUserCoins(item.seller, seller.coins + item.price);

    market.removeListing(id);

    await bagBoardService
      .syncBagForUser(interaction.guild, interaction.user.id)
      .catch(error => console.error('Bag sync failed for buyer after market buy', error));
    await bagBoardService
      .syncBagForUser(interaction.guild, item.seller)
      .catch(error => console.error('Bag sync failed for seller after market buy', error));

    const updatedListings = market.getListings();
    await interaction.reply({
      content: `You bought #${id} **${item.name}** for ${item.price} coins!`,
      embeds: [buildMarketEmbed(updatedListings)],
    });

    await updateMarketBoard(interaction);
  },
};

async function updateMarketBoard(interaction) {
  const guild = interaction.guild;
  if (!guild) return;
  const marketChannel = guild.channels.cache.find(
    channel => channel.name && channel.name.toLowerCase() === 'market' && channel.isTextBased(),
  );
  if (!marketChannel) return;

  const listings = market.getListings();
  const embed = new EmbedBuilder()
    .setTitle('Market Board')
    .setDescription(
      listings.length
        ? listings.map(listing => `#${listing.id} - **${listing.name}** - ${listing.price} coins`).join('\n')
        : '_No items on sale_',
    )
    .setTimestamp();

  const { boardChannelId, boardMessageId } = market.getBoardInfo();
  try {
    if (boardChannelId && boardMessageId && boardChannelId === marketChannel.id) {
      const message = await marketChannel.messages.fetch(boardMessageId);
      await message.edit({ embeds: [embed] });
    } else {
      const message = await marketChannel.send({ embeds: [embed] });
      market.setBoard(marketChannel.id, message.id);
    }
  } catch (error) {
    console.error('Failed updating market board message', error);
    const message = await marketChannel.send({ embeds: [embed] });
    market.setBoard(marketChannel.id, message.id);
  }
}

function buildMarketEmbed(listings) {
  return new EmbedBuilder()
    .setTitle('Market Listings')
    .setDescription(
      listings.length
        ? listings.map(listing => `#${listing.id} - **${listing.name}** - ${listing.price} coins`).join('\n')
        : '_No items on sale_',
    )
    .setTimestamp();
}
