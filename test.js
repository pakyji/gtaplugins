const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syndicatetest')
        .setDescription('Test THE SYNDICATE plugin system'),

    async execute(interaction) {
        await interaction.reply({
            content: '✅ **THE SYNDICATE plugin is working!**\n\n⚜️ The Syndicate Staff Team',
            ephemeral: false
        });
    }
};
