const { EmbedBuilder } = require('discord.js');
const bagBoardManager = require('../repository/bagBoardManager.js');
const productManager = require('../repository/productManager.js');
const userManager = require('../repository/userManager.js');

async function syncBagForUser(guild, userId) {
  if (!guild) {
    return false;
  }

  const bagChannel = guild.channels.cache.find(channel => {
    return channel && channel.name && channel.name.toLowerCase() === 'bag' && channel.isTextBased();
  });

  if (!bagChannel) {
    return false;
  }

  const [products, user] = await Promise.all([
    productManager.getUserProducts(userId),
    userManager.getOrCreateUser(userId),
  ]);

  const discordUser = await guild.client.users.fetch(userId).catch(() => null);
  const username = discordUser?.username ?? userId;
  const avatarUrl = typeof discordUser?.displayAvatarURL === 'function'
    ? discordUser.displayAvatarURL()
    : null;

  const embed = new EmbedBuilder()
    .setTitle(`${username}'s Bag`)
    .setColor(0x00ae86)
    .addFields({ name: 'Coins', value: `${user.coins}`, inline: false })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  if (products.length) {
    products.forEach(product => {
      embed.addFields({
        name: product.name,
        value: `Quantity: **${product.quantity}**`,
        inline: true,
      });
    });
  } else {
    embed.addFields({ name: 'Items', value: '_Your bag is empty_', inline: false });
  }

  const mention = `<@${userId}>`;
  const boardInfo = bagBoardManager.getBoard(userId);

  try {
    if (boardInfo && boardInfo.channelId === bagChannel.id) {
      const message = await bagChannel.messages.fetch(boardInfo.messageId);
      await message.edit({ content: mention, embeds: [embed] });
      bagBoardManager.setBoard(userId, bagChannel.id, message.id);
      return true;
    }
  } catch (error) {
    console.error('Failed editing bag board message', error);
  }

  const message = await bagChannel.send({ content: mention, embeds: [embed] });
  bagBoardManager.setBoard(userId, bagChannel.id, message.id);
  return true;
}

module.exports = {
  syncBagForUser,
};
