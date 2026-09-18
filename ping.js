const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the responsiveness and latency of the bot.'),

    async execute(interaction) {
        // Pihle temporary reply bhejo latency naapne ke liye
        const sent = await interaction.reply({
            content: 'Measuring latency...',
            fetchReply: true,
            ephemeral: true
        });

        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        // Professional looking Embed
        const embed = new EmbedBuilder()
            .setColor(0x2f3136)
            .setTitle('🏓 Pong! Bot Status')
            .setDescription('Here is a detailed breakdown of the network performance:')
            .addFields(
                { name: '🌐 Roundtrip Latency', value: `\`${roundtripLatency}ms\``, inline: true },
                { name: '⚡ WebSocket API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: 'Powered by Professor 🕶️ | Ultimate Matchmaking Hub' })
            .setTimestamp();

        // Final embed response edit karna
        await interaction.editReply({
            content: null,
            embeds: [embed]
        });
    }
};

