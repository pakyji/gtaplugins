const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const pluginsDir = path.join(__dirname, 'plugins');

if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
}

client.plugins = new Collection();


// ================================
// LOAD PLUGINS
// ================================

function loadPlugins() {
    client.plugins.clear();

    const files = fs.readdirSync(pluginsDir)
        .filter(file => file.endsWith('.js'));

    for (const file of files) {
        try {
            const filePath = path.join(pluginsDir, file);

            delete require.cache[require.resolve(filePath)];

            const plugin = require(filePath);

            if (!plugin.data || !plugin.execute) {
                console.error(
                    `[PLUGIN ERROR] ${file}: Plugin must contain "data" and "execute".`
                );
                continue;
            }

            client.plugins.set(file, plugin);

            console.log(`[PLUGIN] Loaded: ${file}`);

        } catch (error) {
            console.error(
                `[PLUGIN ERROR] Failed to load ${file}:`,
                error
            );
        }
    }
}


// ================================
// GET COMMAND JSON (ERROR FIXED)
// ================================

function getCommandJSON(plugin) {
    if (!plugin.data) {
        throw new Error("Plugin is missing 'data' property.");
    }

    // Agar plugin.data ek SlashCommandBuilder instance hai
    if (typeof plugin.data.toJSON === 'function') {
        return plugin.data.toJSON();
    }

    // Agar plugin.data pehle se hi ek plain object hai
    if (typeof plugin.data === 'object' && plugin.data !== null) {
        return plugin.data;
    }

    throw new Error("Plugin 'data' must be a valid object or SlashCommandBuilder.");
}


// ================================
// REGISTER COMMANDS
// ================================

async function registerCommands() {

    const commands = [];

    // Main plugin management command
    const pluginCommand = new SlashCommandBuilder()
        .setName('plugin')
        .setDescription('Manage Syndicate plugins')
        .addSubcommand(sub =>
            sub
                .setName('install')
                .setDescription('Install a plugin from a URL')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('Raw GitHub plugin URL')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Plugin filename')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove an installed plugin')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Plugin filename')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

    commands.push(pluginCommand.toJSON());

    // Plugin commands
    for (const [file, plugin] of client.plugins) {
        try {
            const commandData = getCommandJSON(plugin);

            if (commandData.name && commandData.description) {
                commands.push(commandData);
            }

        } catch (error) {
            console.error(
                `[PLUGIN ERROR] Could not register ${file}:`,
                error
            );
        }
    }

    const rest = new REST({ version: '10' })
        .setToken(TOKEN);

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        {
            body: commands
        }
    );

    console.log(
        `[COMMANDS] Registered ${commands.length} commands.`
    );
}


// ================================
// READY
// ================================

client.once('ready', async () => {

    console.log(`Logged in as ${client.user.tag}!`);

    loadPlugins();

    try {
        await registerCommands();

        console.log(
            '[SYSTEM] Plugin system is ready!'
        );

    } catch (error) {

        console.error(
            '[SYSTEM ERROR] Command registration failed:',
            error
        );
    }
});


// ================================
// INTERACTIONS
// ================================

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }


    // ============================
    // /plugin
    // ============================

    if (interaction.commandName === 'plugin') {

        // SERVER OWNER ONLY
        if (interaction.guild.ownerId !== interaction.user.id) {

            return interaction.reply({
                content:
                    '❌ Only the **Server Owner** can install or remove plugins.',
                ephemeral: true
            });
        }


        // ========================
        // INSTALL
        // ========================

        if (interaction.options.getSubcommand() === 'install') {

            const url = interaction.options.getString('url');
            let name = interaction.options.getString('name');

            if (!name.endsWith('.js')) {
                name += '.js';
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }

                const code = await response.text();

                if (!code.includes('module.exports')) {
                    throw new Error(
                        'Invalid plugin file.'
                    );
                }

                const filePath = path.join(
                    pluginsDir,
                    name
                );

                fs.writeFileSync(
                    filePath,
                    code,
                    'utf8'
                );

                // Test plugin before accepting it
                delete require.cache[
                    require.resolve(filePath)
                ];

                const plugin = require(filePath);

                if (!plugin.data || !plugin.execute) {

                    fs.unlinkSync(filePath);

                    throw new Error(
                        'Plugin must contain "data" and "execute".'
                    );
                }

                // Reload
                loadPlugins();

                // Re-register commands
                await registerCommands();

                await interaction.editReply({
                    content:
                        `✅ Plugin installed successfully!\n\n` +
                        `📦 **Name:** \`${name}\`\n` +
                        `🔗 **Source:** GitHub\n\n` +
                        `The plugin command has been registered.`
                });

                console.log(
                    `[PLUGIN] Installed: ${name}`
                );

            } catch (error) {

                console.error(
                    '[PLUGIN INSTALL ERROR]',
                    error
                );

                await interaction.editReply({
                    content:
                        `❌ **Plugin installation failed.**\n\n` +
                        `\`${error.message}\``
                });
            }

            return;
        }


        // ========================
        // REMOVE
        // ========================

        if (interaction.options.getSubcommand() === 'remove') {

            const name =
                interaction.options.getString('name');

            const fileName =
                name.endsWith('.js')
                    ? name
                    : `${name}.js`;

            const filePath =
                path.join(
                    pluginsDir,
                    fileName
                );

            if (!fs.existsSync(filePath)) {

                return interaction.reply({
                    content:
                        `❌ Plugin \`${fileName}\` was not found.`,
                    ephemeral: true
                });
            }

            try {

                fs.unlinkSync(filePath);

                loadPlugins();

                await registerCommands();

                await interaction.reply({
                    content:
                        `🗑️ Plugin \`${fileName}\` removed successfully.`,
                    ephemeral: true
                });

                console.log(
                    `[PLUGIN] Removed: ${fileName}`
                );

            } catch (error) {

                console.error(
                    '[PLUGIN REMOVE ERROR]',
                    error
                );

                await interaction.reply({
                    content:
                        `❌ Failed to remove plugin.\n\`${error.message}\``,
                    ephemeral: true
                });
            }

            return;
        }
    }


    // ============================
    // PLUGIN COMMANDS
    // ============================

    const commandName =
        interaction.commandName;

    for (const [file, plugin] of client.plugins) {

        try {

            const commandData =
                getCommandJSON(plugin);

            if (
                commandData.name === commandName
            ) {

                await plugin.execute(
                    interaction,
                    client
                );

                return;
            }

        } catch (error) {

            console.error(
                `[PLUGIN ERROR] ${file}:`,
                error
            );

            if (!interaction.replied &&
                !interaction.deferred) {

                await interaction.reply({
                    content:
                        '❌ An error occurred while running this plugin.',
                    ephemeral: true
                });
            }

            return;
        }
    }
});


// ================================
// LOGIN
// ================================

client.login(TOKEN);
