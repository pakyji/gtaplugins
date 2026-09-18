const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

// ==========================================
// APARTMENT HEIST PLUGIN
// ==========================================

const heists = {
    fleeca: {
        name: 'Fleeca Job',
        players: 2,
        setups: [
            'Scope Out',
            'Kuruma',
            'Drilling'
        ]
    },

    prison: {
        name: 'Prison Break',
        players: 4,
        setups: [
            'Plane',
            'Bus',
            'Station',
            'Wet Work'
        ]
    },

    humane: {
        name: 'Humane Labs Raid',
        players: 4,
        setups: [
            'Key Codes',
            'Insurgents',
            'EMP',
            'Valkyrie',
            'Deliver EMP'
        ]
    },

    seriesa: {
        name: 'Series A Funding',
        players: 4,
        setups: [
            'Coke',
            'Trash Truck',
            'Bikers',
            'Weed',
            'Steal Meth'
        ]
    },

    pacific: {
        name: 'Pacific Standard',
        players: 4,
        setups: [
            'Vans',
            'Signal',
            'Hack',
            'Convoy'
        ]
    }
};

const platforms = [
    'PC',
    'PC Enhanced',
    'PS4',
    'PS5',
    'Xbox Series'
];

const lobbies = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apartment-heist')
        .setDescription('Create and manage an Apartment Heist lobby.')
        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription('Create a new Apartment Heist lobby.')
        )
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('Show active Apartment Heist lobbies.')
        ),

    async execute(interaction) {

        // ==========================================
        // /apartment-heist create
        // ==========================================

        if (interaction.options.getSubcommand() === 'create') {

            const heistMenu = new StringSelectMenuBuilder()
                .setCustomId('ah_heist')
                .setPlaceholder('🏢 Select an Apartment Heist')
                .addOptions(
                    Object.entries(heists).map(([id, h]) => ({
                        label: h.name,
                        value: id,
                        description: `${h.players} players • ${h.setups.length} setups`
                    }))
                );

            const platformMenu = new StringSelectMenuBuilder()
                .setCustomId('ah_platform')
                .setPlaceholder('🎮 Select your platform')
                .addOptions(
                    platforms.map(p => ({
                        label: p,
                        value: p
                    }))
                );

            const typeMenu = new StringSelectMenuBuilder()
                .setCustomId('ah_type')
                .setPlaceholder('🎯 Setup or Finale?')
                .addOptions(
                    {
                        label: 'Setup',
                        value: 'setup',
                        emoji: '🛠️'
                    },
                    {
                        label: 'Finale',
                        value: 'finale',
                        emoji: '🏁'
                    }
                );

            const row1 = new ActionRowBuilder().addComponents(heistMenu);
            const row2 = new ActionRowBuilder().addComponents(platformMenu);
            const row3 = new ActionRowBuilder().addComponents(typeMenu);

            const embed = new EmbedBuilder()
                .setTitle('🏢 Apartment Heist Manager')
                .setDescription(
                    'Create your recruitment lobby.\n\n' +
                    'Select the **Heist**, **Platform**, and **Type** below.'
                )
                .setFooter({
                    text: 'THE SYNDICATE • Heist System'
                });

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2, row3],
                ephemeral: true
            });

            return;
        }

        // ==========================================
        // /apartment-heist list
        // ==========================================

        if (interaction.options.getSubcommand() === 'list') {

            if (lobbies.size === 0) {
                return interaction.reply({
                    content: '📭 There are currently no active Apartment Heist lobbies.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🏢 Active Apartment Heists')
                .setDescription(
                    [...lobbies.values()]
                        .map((lobby, i) =>
                            `**${i + 1}. ${lobby.heist.name} — ${lobby.type.toUpperCase()}**\n` +
                            `🎮 ${lobby.platform}\n` +
                            `👑 Host: <@${lobby.hostId}>\n` +
                            `👥 Players: ${lobby.players.length}/${lobby.maxPlayers}\n` +
                            `📌 ${lobby.channelId ? `<#${lobby.channelId}>` : 'Unknown'}`
                        )
                        .join('\n\n')
                );

            return interaction.reply({
                embeds: [embed]
            });
        }
    },

    // ==========================================
    // BUTTONS / SELECT MENUS
    // ==========================================

    async handleInteraction(interaction) {

        // ------------------------------------------
        // HEIST SELECT
        // ------------------------------------------

        if (interaction.isStringSelectMenu() &&
            interaction.customId === 'ah_heist') {

            const heistId = interaction.values[0];

            interaction.message._ahHeist = heistId;

            await interaction.reply({
                content:
                    `🏢 **${heists[heistId].name}** selected.\n\n` +
                    `Now select the platform and Setup/Finale.`,
                ephemeral: true
            });

            return;
        }

        // ------------------------------------------
        // PLATFORM SELECT
        // ------------------------------------------

        if (interaction.isStringSelectMenu() &&
            interaction.customId === 'ah_platform') {

            interaction.message._ahPlatform = interaction.values[0];

            await interaction.reply({
                content:
                    `🎮 Platform selected: **${interaction.values[0]}**`,
                ephemeral: true
            });

            return;
        }

        // ------------------------------------------
        // TYPE SELECT
        // ------------------------------------------

        if (interaction.isStringSelectMenu() &&
            interaction.customId === 'ah_type') {

            const type = interaction.values[0];

            // Try to recover selected values from message
            const heistId = interaction.message._ahHeist;

            if (!heistId) {
                return interaction.reply({
                    content: '⚠️ Please select the Heist first.',
                    ephemeral: true
                });
            }

            if (!interaction.message._ahPlatform) {
                return interaction.reply({
                    content: '⚠️ Please select the platform first.',
                    ephemeral: true
                });
            }

            const platform = interaction.message._ahPlatform;
            const heist = heists[heistId];

            if (type === 'setup') {

                const setupMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ah_setup_${heistId}_${platform}`)
                    .setPlaceholder('🛠️ Select required setup')
                    .addOptions(
                        heist.setups.map((setup, index) => ({
                            label: setup,
                            value: String(index),
                            description: `Setup ${index + 1}`
                        }))
                    );

                await interaction.reply({
                    content: '🛠️ Select which setup you are looking for:',
                    components: [
                        new ActionRowBuilder().addComponents(setupMenu)
                    ],
                    ephemeral: true
                });

            } else {

                await showFinaleModal(
                    interaction,
                    heistId,
                    platform
                );
            }

            return;
        }

        // ------------------------------------------
        // SETUP SELECT
        // ------------------------------------------

        if (interaction.isStringSelectMenu() &&
            interaction.customId.startsWith('ah_setup_')) {

            const parts = interaction.customId.split('_');

            const heistId = parts[2];
            const platform = parts.slice(3).join('_');

            const setupIndex = Number(interaction.values[0]);
            const setup = heists[heistId].setups[setupIndex];

            await createLobby(
                interaction,
                heistId,
                platform,
                'setup',
                setup
            );

            return;
        }

        // ------------------------------------------
        // JOIN
        // ------------------------------------------

        if (interaction.isButton() &&
            interaction.customId.startsWith('ah_join_')) {

            const lobbyId = interaction.customId.replace('ah_join_', '');
            const lobby = lobbies.get(lobbyId);

            if (!lobby) {
                return interaction.reply({
                    content: '❌ This heist lobby no longer exists.',
                    ephemeral: true
                });
            }

            if (lobby.locked) {
                return interaction.reply({
                    content: '🔒 This lobby is locked.',
                    ephemeral: true
                });
            }

            if (lobby.players.includes(interaction.user.id)) {
                return interaction.reply({
                    content: '⚠️ You are already in this lobby.',
                    ephemeral: true
                });
            }

            if (lobby.players.length >= lobby.maxPlayers) {
                return interaction.reply({
                    content: '❌ This lobby is already full.',
                    ephemeral: true
                });
            }

            lobby.players.push(interaction.user.id);

            await interaction.reply({
                content: `✅ You joined **${lobby.heist.name}**.`,
                ephemeral: true
            });

            await updateLobbyMessage(lobby);

            return;
        }

        // ------------------------------------------
        // LEAVE
        // ------------------------------------------

        if (interaction.isButton() &&
            interaction.customId.startsWith('ah_leave_')) {

            const lobbyId = interaction.customId.replace('ah_leave_', '');
            const lobby = lobbies.get(lobbyId);

            if (!lobby) {
                return interaction.reply({
                    content: '❌ Lobby no longer exists.',
                    ephemeral: true
                });
            }

            const index = lobby.players.indexOf(interaction.user.id);

            if (index === -1) {
                return interaction.reply({
                    content: '⚠️ You are not in this lobby.',
                    ephemeral: true
                });
            }

            // Host cannot leave his own lobby
            if (interaction.user.id === lobby.hostId) {
                return interaction.reply({
                    content:
                        '👑 You are the host. Close the lobby instead of leaving it.',
                    ephemeral: true
                });
            }

            lobby.players.splice(index, 1);

            await interaction.reply({
                content: '🚪 You left the heist lobby.',
                ephemeral: true
            });

            await updateLobbyMessage(lobby);

            return;
        }

        // ------------------------------------------
        // LOCK
        // ------------------------------------------

        if (interaction.isButton() &&
            interaction.customId.startsWith('ah_lock_')) {

            const lobbyId = interaction.customId.replace('ah_lock_', '');
            const lobby = lobbies.get(lobbyId);

            if (!lobby) return;

            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '🔒 Only the host can lock the lobby.',
                    ephemeral: true
                });
            }

            lobby.locked = true;

            await interaction.reply({
                content: '🔒 Lobby locked. No more players can join.',
                ephemeral: true
            });

            await updateLobbyMessage(lobby);

            return;
        }

        // ------------------------------------------
        // CLOSE
        // ------------------------------------------

        if (interaction.isButton() &&
            interaction.customId.startsWith('ah_close_')) {

            const lobbyId = interaction.customId.replace('ah_close_', '');
            const lobby = lobbies.get(lobbyId);

            if (!lobby) return;

            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '👑 Only the host can close this lobby.',
                    ephemeral: true
                });
            }

            lobbies.delete(lobbyId);

            await interaction.update({
                content: '🧹 **Heist lobby closed by the host.**',
                embeds: [],
                components: []
            });

            return;
        }
    }
};

// ==========================================
// FINALE MODAL
// ==========================================

async function showFinaleModal(interaction, heistId, platform) {

    const modal = new ModalBuilder()
        .setCustomId(`ah_finale_${heistId}_${platform}`)
        .setTitle('🏁 Finale — Player Cuts');

    const cuts = new TextInputBuilder()
        .setCustomId('cuts')
        .setLabel('Cuts — example: 40,20,20,20')
        .setPlaceholder('Total must equal 100%')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(cuts)
    );

    await interaction.showModal(modal);

    // The modal submit is handled below through exported helper
}

// ==========================================
// CREATE LOBBY
// ==========================================

async function createLobby(
    interaction,
    heistId,
    platform,
    type,
    setup
) {

    const heist = heists[heistId];

    const lobbyId =
        `${interaction.guild.id}-${Date.now()}`;

    const lobby = {
        id: lobbyId,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,

        hostId: interaction.user.id,

        heist,
        heistId,

        platform,
        type,

        setup: setup || null,

        maxPlayers: heist.players,

        players: [interaction.user.id],

        cuts: null,

        locked: false,

        messageId: null
    };

    lobbies.set(lobbyId, lobby);

    const embed = buildLobbyEmbed(lobby);

    const buttons = buildLobbyButtons(lobby);

    const message = await interaction.channel.send({
        embeds: [embed],
        components: buttons,
        allowedMentions: {
            parse: []
        }
    });

    lobby.messageId = message.id;

    await interaction.reply({
        content:
            `🚀 **${type === 'setup' ? 'Setup' : 'Heist Finale'} launched!**\n` +
            `📢 The recruitment broadcast has been posted without pinging @everyone.`,
        ephemeral: true
    });
}

// ==========================================
// EMBED
// ==========================================

function buildLobbyEmbed(lobby) {

    const playerList =
        lobby.players.length
            ? lobby.players
                .map((id, i) => `${i + 1}. <@${id}>`)
                .join('\n')
            : 'No players';

    let description =
        `🎮 **Platform:** ${lobby.platform}\n` +
        `🎯 **Type:** ${lobby.type === 'setup' ? '🛠️ Setup' : '🏁 Finale'}\n`;

    if (lobby.setup) {
        description +=
            `📋 **Setup:** ${lobby.setup}\n`;
    }

    description +=
        `👑 **Host:** <@${lobby.hostId}>\n` +
        `👥 **Players:** ${lobby.players.length}/${lobby.maxPlayers}\n\n` +
        `**👥 Players in Lobby**\n${playerList}`;

    if (lobby.cuts) {
        description +=
            `\n\n💰 **Cuts:** ${lobby.cuts.join('% • ')}%`;
    }

    description +=
        `\n\n${lobby.locked
            ? '🔒 **LOBBY LOCKED**'
            : '🟢 **LOOKING FOR PLAYERS**'}`;

    return new EmbedBuilder()
        .setTitle(`🏢 ${lobby.heist.name}`)
        .setDescription(description)
        .setColor(0x5865F2)
        .setFooter({
            text: 'THE SYNDICATE • Apartment Heist System'
        });
}

// ==========================================
// BUTTONS
// ==========================================

function buildLobbyButtons(lobby) {

    const join = new ButtonBuilder()
        .setCustomId(`ah_join_${lobby.id}`)
        .setLabel('Join Heist')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Success)
        .setDisabled(
            lobby.locked ||
            lobby.players.length >= lobby.maxPlayers
        );

    const leave = new ButtonBuilder()
        .setCustomId(`ah_leave_${lobby.id}`)
        .setLabel('Leave')
        .setEmoji('🚪')
        .setStyle(ButtonStyle.Secondary);

    const lock = new ButtonBuilder()
        .setCustomId(`ah_lock_${lobby.id}`)
        .setLabel('Lock')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Primary);

    const close = new ButtonBuilder()
        .setCustomId(`ah_close_${lobby.id}`)
        .setLabel('Close')
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Danger);

    return [
        new ActionRowBuilder().addComponents(
            join,
            leave,
            lock,
            close
        )
    ];
}

// ==========================================
// UPDATE MESSAGE
// ==========================================

async function updateLobbyMessage(lobby) {

    try {

        const channel =
            await global.client.channels.fetch(lobby.channelId);

        const message =
            await channel.messages.fetch(lobby.messageId);

        await message.edit({
            embeds: [buildLobbyEmbed(lobby)],
            components: buildLobbyButtons(lobby)
        });

    } catch (error) {

        console.error(
            '[Apartment Heist] Could not update lobby:',
            error.message
        );
    }
                      }
