const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Handle autocomplete interactions
		if (interaction.isAutocomplete && typeof interaction.isAutocomplete === 'function' ? interaction.isAutocomplete() : false) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;
			try {
				if (typeof command.autocomplete === 'function') {
					await command.autocomplete(interaction);
				}
			} catch (error) {
				console.error(error);
			}
			return;
		}

		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};
