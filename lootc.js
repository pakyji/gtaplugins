const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const PRIMARY = {
    tequila: { name: "Sinsimito Tequila", normal: 400000, hard: 440000 },
    ruby: { name: "Ruby Necklace", normal: 560000, hard: 616000 },
    bonds: { name: "Bearer Bonds", normal: 616000, hard: 677600 },
    pink: { name: "Pink Diamond", normal: 910000, hard: 1001000 },
    panther: { name: "Panther Statue", normal: 1900000, hard: 2090000 }
};

const SECONDARY = {
    cash: { name: "Cash", value: 72900, bag: 25 },
    weed: { name: "Weed", value: 119475, bag: 37.5 },
    artwork: { name: "Artwork", value: 151875, bag: 50 },
    cocaine: { name: "Cocaine", value: 180225, bag: 50 },
    gold: { name: "Gold", value: 297750, bag: 66.7 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cayo")
        .setDescription("Cayo Perico loot & payout calculator"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle("🏝️ CAYO PERICO — LOOT CALCULATOR")
            .setDescription(
                "Configure your heist below.\n\n" +
                "🎯 **Primary Target**\n" +
                "💰 **Secondary Loot**\n" +
                "👥 **Players & Cuts**\n\n" +
                "❌ Pavel's 2% cut is **NOT included**."
            );

        const primaryMenu = new StringSelectMenuBuilder()
            .setCustomId("cayo_primary")
            .setPlaceholder("🎯 Select Primary Target")
            .addOptions(
                { label: "Sinsimito Tequila", value: "tequila", emoji: "🥃" },
                { label: "Ruby Necklace", value: "ruby", emoji: "💎" },
                { label: "Bearer Bonds", value: "bonds", emoji: "📜" },
                { label: "Pink Diamond", value: "pink", emoji: "💠" },
                { label: "Panther Statue", value: "panther", emoji: "🐆" }
            );

        const difficultyMenu = new StringSelectMenuBuilder()
            .setCustomId("cayo_difficulty")
            .setPlaceholder("⚔️ Select Difficulty")
            .addOptions(
                { label: "Normal Mode", value: "normal", emoji: "🟢" },
                { label: "Hard Mode", value: "hard", emoji: "🔴" }
            );

        const lootMenu = new StringSelectMenuBuilder()
            .setCustomId("cayo_loot")
            .setPlaceholder("💰 Select Secondary Loot")
            .setMinValues(1)
            .setMaxValues(5)
            .addOptions(
                { label: "Cash", value: "cash", emoji: "💵" },
                { label: "Weed", value: "weed", emoji: "🌿" },
                { label: "Artwork", value: "artwork", emoji: "🖼️" },
                { label: "Cocaine", value: "cocaine", emoji: "❄️" },
                { label: "Gold", value: "gold", emoji: "🥇" }
            );

        const players = new StringSelectMenuBuilder()
            .setCustomId("cayo_players")
            .setPlaceholder("👥 Select Number of Players")
            .addOptions(
                { label: "1 Player", value: "1" },
                { label: "2 Players", value: "2" },
                { label: "3 Players", value: "3" },
                { label: "4 Players", value: "4" }
            );

        const calculate = new ButtonBuilder()
            .setCustomId("cayo_calculate")
            .setLabel("Calculate Payout")
            .setEmoji("💰")
            .setStyle(ButtonStyle.Success);

        const row1 = new ActionRowBuilder().addComponents(primaryMenu);
        const row2 = new ActionRowBuilder().addComponents(difficultyMenu);
        const row3 = new ActionRowBuilder().addComponents(lootMenu);
        const row4 = new ActionRowBuilder().addComponents(players);
        const row5 = new ActionRowBuilder().addComponents(calculate);

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2, row3, row4, row5]
        });

        const selected = {
            primary: null,
            difficulty: "normal",
            loot: [],
            players: 1
        };

        const collector = interaction.channel.createMessageComponentCollector({
            time: 10 * 60 * 1000
        });

        collector.on("collect", async i => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ This calculator belongs to another player.",
                    ephemeral: true
                });
            }

            if (i.customId === "cayo_primary") {
                selected.primary = i.values[0];
                await i.reply({
                    content: `🎯 Primary Target: **${PRIMARY[i.values[0]].name}**`,
                    ephemeral: true
                });
            }

            if (i.customId === "cayo_difficulty") {
                selected.difficulty = i.values[0];
                await i.reply({
                    content: `⚔️ Difficulty: **${i.values[0].toUpperCase()}**`,
                    ephemeral: true
                });
            }

            if (i.customId === "cayo_loot") {
                selected.loot = i.values;
                await i.reply({
                    content:
                        `💰 Secondary Loot selected:\n` +
                        i.values.map(x => `• ${SECONDARY[x].name}`).join("\n"),
                    ephemeral: true
                });
            }

            if (i.customId === "cayo_players") {
                selected.players = Number(i.values[0]);
                await i.reply({
                    content: `👥 Players: **${selected.players}**`,
                    ephemeral: true
                });
            }

            if (i.customId === "cayo_calculate") {

                if (!selected.primary) {
                    return i.reply({
                        content: "❌ Select a Primary Target first.",
                        ephemeral: true
                    });
                }

                if (!selected.loot.length) {
                    return i.reply({
                        content: "❌ Select your Secondary Loot.",
                        ephemeral: true
                    });
                }

                const primary =
                    PRIMARY[selected.primary][selected.difficulty];

                let secondaryTotal = 0;
                let bagUsed = 0;

                for (const loot of selected.loot) {
                    secondaryTotal += SECONDARY[loot].value;
                    bagUsed += SECONDARY[loot].bag;
                }

                /*
                 * Cayo uses 10% fencing fee.
                 * Pavel's 2% is intentionally removed.
                 */
                const gross = primary + secondaryTotal;
                const fencingFee = gross * 0.10;

                let elite = 0;

                if (selected.difficulty === "hard") {
                    elite = 100000;
                } else {
                    elite = 50000;
                }

                const finalTotal = gross - fencingFee + elite;

                const hostCut =
                    selected.players === 1
                        ? 100
                        : 100;

                const hostPayout =
                    finalTotal * (hostCut / 100);

                const secondaryText =
                    selected.loot
                        .map(x =>
                            `• ${SECONDARY[x].name}: **$${SECONDARY[x].value.toLocaleString()}**`
                        )
                        .join("\n");

                const result = new EmbedBuilder()
                    .setTitle("🏝️ CAYO PERICO — FINAL CALCULATION")
                    .setColor(0x2ecc71)
                    .addFields(
                        {
                            name: "🎯 Primary Target",
                            value:
                                `${PRIMARY[selected.primary].name}\n` +
                                `💵 **$${primary.toLocaleString()}**`,
                            inline: false
                        },
                        {
                            name: "💰 Secondary Loot",
                            value: secondaryText,
                            inline: false
                        },
                        {
                            name: "🎒 Loot Bag",
                            value:
                                `Used: **${Math.min(bagUsed, 100).toFixed(1)}%**\n` +
                                `Remaining: **${Math.max(0, 100 - bagUsed).toFixed(1)}%**`,
                            inline: true
                        },
                        {
                            name: "💵 Gross Take",
                            value: `**$${gross.toLocaleString()}**`,
                            inline: true
                        },
                        {
                            name: "🧾 Fencing Fee",
                            value: `-$${fencingFee.toLocaleString()}`,
                            inline: true
                        },
                        {
                            name: "⚡ Elite Bonus",
                            value: `+$${elite.toLocaleString()}`,
                            inline: true
                        },
                        {
                            name: "👥 Players",
                            value: `**${selected.players}**`,
                            inline: true
                        },
                        {
                            name: "💰 Final Take",
                            value: `# **$${finalTotal.toLocaleString()}**`,
                            inline: false
                        },
                        {
                            name: "👑 Host Payout",
                            value: `**$${hostPayout.toLocaleString()}**`,
                            inline: false
                        }
                    )
                    .setFooter({
                        text: "Pavel's 2% cut excluded • Cayo Perico Calculator"
                    });

                await i.update({
                    embeds: [result],
                    components: []
                });

                collector.stop();
            }
        });
    }
};
