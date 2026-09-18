const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Register your GTA platform and PlayStation ID.')
        .addStringOption(option =>
            option
                .setName('platform')
                .setDescription('Select your gaming platform')
                .setRequired(true)
                .addChoices(
                    { name: 'PC', value: 'PC' },
                    { name: 'PC Enhanced', value: 'PC Enhanced' },
                    { name: 'PS4', value: 'PS4' },
                    { name: 'PS5', value: 'PS5' },
                    { name: 'Xbox Series', value: 'Xbox Series' }
                )
        )
        .addStringOption(option =>
            option
                .setName('playstation_id')
                .setDescription('Enter your PlayStation ID')
                .setRequired(true)
        ),
    
    async execute(interaction, client) {
        const platform = interaction.options.getString('platform');
        const psId = interaction.options.getString('playstation_id');
        const user = interaction.user;

        // Aapka specific target channel ID jahan sabka card send hoga
        const targetChannelId = '901702088738865172';

        // Embed card design
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎮 New Player Registered!')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Discord User', value: `${user}`, inline: true },
                { name: '🖥️ Platform', value: `\`${platform}\``, inline: true },
                { name: '🆔 PlayStation ID', value: `\`${psId}\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'GTA Bot Registration System', iconURL: client.user.displayAvatarURL() });

        // User ko sirf personal (ephemeral) message dikhega taaki chat spam na ho
        await interaction.reply({ 
            content: `✅ Your details have been successfully submitted!`, 
            ephemeral: true 
        });

        try {
            // Target channel fetch karke usme embed send karna
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                await targetChannel.send({ embeds: [embed] });
            } else {
                console.error(`[ERROR] Target channel ${targetChannelId} nahi mila!`);
            }
        } catch (error) {
            console.error('[ERROR] Channel par message bhejne mein masla aaya:', error);
        }
    }
};
