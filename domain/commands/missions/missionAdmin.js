const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const missionManager = require('../../repository/missionManager.js');
const Mission = require('../../database/models/mission.js');

const OWNER_ID = '396765398894379009';

const DOC_TYPES = Mission.allowedDocumentTypes ? Mission.allowedDocumentTypes() : ['image', 'pdf', 'txt'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('missionadmin')
    .setDescription('Admin tools for missions')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a mission')
        .addStringOption(option =>
          option.setName('title').setDescription('Mission title').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('description').setDescription('Mission description').setRequired(true),
        )
        .addIntegerOption(option =>
          option
            .setName('participants')
            .setDescription('Minimum number of participants required')
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addStringOption(option =>
          option
            .setName('documents')
            .setDescription('Comma-separated list of required document types (image,pdf,txt)'),
        )
        .addBooleanOption(option =>
          option
            .setName('same_team')
            .setDescription('Require all participants to belong to the same team'),
        )
        .addIntegerOption(option =>
          option
            .setName('reward_coins')
            .setDescription('Coins each participant receives upon success')
            .setMinValue(0),
        )
        .addStringOption(option =>
          option
            .setName('reward_items')
            .setDescription('Comma list of item:quantity rewards (e.g. potion:2, elixir:1)'),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a mission by title')
        .addStringOption(option =>
          option.setName('title').setDescription('Mission title to delete').setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all missions'),
    ),

  async execute(interaction) {
    if (!isPrivileged(interaction)) {
      return interaction.reply({ content: 'This command is for administrators only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const minParticipants = interaction.options.getInteger('participants') ?? 1;
      const documentsRaw = interaction.options.getString('documents') ?? '';
      const requireSameTeam = interaction.options.getBoolean('same_team') ?? false;
      const rewardCoins = interaction.options.getInteger('reward_coins') ?? 0;
      const rewardItemsRaw = interaction.options.getString('reward_items') ?? '';

      const requiredDocuments = documentsRaw
        .split(',')
        .map(entry => entry.trim().toLowerCase())
        .filter(Boolean);

      if (requiredDocuments.some(doc => !DOC_TYPES.includes(doc))) {
        return interaction.reply({
          content: `Invalid document type provided. Allowed values: ${DOC_TYPES.join(', ')}.`,
          ephemeral: true,
        });
      }

      let rewardItems;
      try {
        rewardItems = parseRewardItems(rewardItemsRaw);
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }

      try {
        await missionManager.createMission({
          title,
          description,
          minParticipants,
          requiredDocuments,
          requireSameTeam,
          rewardCoins,
          rewardItems,
          createdBy: interaction.user.id,
        });

        return interaction.reply({ content: `Mission **${title}** created successfully.`, ephemeral: true });
      } catch (error) {
        console.error('Error creating mission:', error);
        return interaction.reply({
          content: `Failed to create mission: ${error.message}`,
          ephemeral: true,
        });
      }
    }

    if (sub === 'delete') {
      const title = interaction.options.getString('title');
      try {
        const mission = await missionManager.deleteMission(title);
        if (!mission) {
          return interaction.reply({ content: `No mission found with title **${title}**.`, ephemeral: true });
        }
        return interaction.reply({ content: `Mission **${title}** deleted.`, ephemeral: true });
      } catch (error) {
        console.error('Error deleting mission:', error);
        return interaction.reply({ content: `Failed to delete mission: ${error.message}`, ephemeral: true });
      }
    }

    if (sub === 'list') {
      const missions = await missionManager.getAllMissions();
      if (!missions.length) {
        return interaction.reply({ content: 'No missions configured.', ephemeral: true });
      }

      const embed = new EmbedBuilder().setTitle('Configured Missions').setColor(0x7289da);
      missions.forEach(mission => {
        const docLabel = mission.requiredDocuments.length
          ? mission.requiredDocuments.join(', ')
          : 'None';
        embed.addFields({
          name: mission.title,
          value: `Participants: ${mission.minParticipants}\nDocuments: ${docLabel}\nSame team: ${mission.requireSameTeam ? 'Yes' : 'No'}\nRewards: ${formatRewards(mission)}\n${mission.description}`,
        });
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

function isPrivileged(interaction) {
  if (interaction.user.id === OWNER_ID) {
    return true;
  }
  return interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
}

function parseRewardItems(raw) {
  if (!raw) return [];
  const entries = raw.split(',').map(part => part.trim()).filter(Boolean);
  const rewards = [];
  for (const entry of entries) {
    const [namePart, quantityPart] = entry.split(':').map(piece => piece?.trim());
    if (!namePart || !quantityPart) {
      throw new Error(
        'Invalid reward_items format. Use name:quantity pairs separated by commas (e.g. potion:2, elixir:1).',
      );
    }
    const quantity = Number.parseInt(quantityPart, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Reward item quantities must be positive integers.');
    }
    rewards.push({ name: namePart, quantity });
  }
  return rewards;
}

function formatRewards(mission) {
  const parts = [];
  if (mission.rewardCoins && mission.rewardCoins > 0) {
    parts.push(`${mission.rewardCoins} coins each`);
  }
  if (mission.rewardItems?.length) {
    const items = mission.rewardItems.map(item => `${item.name} x${item.quantity}`).join(', ');
    parts.push(items);
  }
  return parts.length ? parts.join(' | ') : 'None';
}
