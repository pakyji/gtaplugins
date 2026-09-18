const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const heists = {
  fleeca: ["Fleeca Job", 2],
  prison: ["Prison Break", 4],
  humane: ["Humane Labs", 4],
  seriesa: ["Series A Funding", 4],
  pacific: ["Pacific Standard", 4]
};

const active = new Map();

module.exports = client => {

  const cmd = new SlashCommandBuilder()
    .setName("heist")
    .setDescription("GTA Online Apartment Heist")
    .addSubcommand(s =>
      s.setName("create")
       .setDescription("Create a heist"))
    .addSubcommand(s =>
      s.setName("list")
       .setDescription("Show active heists"));

  client.application.commands.create(cmd);

  client.on("interactionCreate", async i => {

    // CREATE / LIST
    if (i.isChatInputCommand() && i.commandName === "heist") {

      if (i.options.getSubcommand() === "list") {
        if (!active.size)
          return i.reply("🔎 No active heists.");

        const e = new EmbedBuilder()
          .setTitle("🏢 ACTIVE SYNDICATE HEISTS");

        for (const h of active.values()) {
          e.addFields({
            name: `🏢 ${h.name}`,
            value:
              `👑 Host: <@${h.host}>\n` +
              `👥 Players: ${h.players.length}/${h.max}\n` +
              h.players.map((p, n) =>
                `${n + 1}. <@${p}>`
              ).join("\n")
          });
        }

        return i.reply({ embeds: [e] });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId("select_heist")
        .setPlaceholder("🏢 Select a Heist")
        .addOptions(
          Object.entries(heists).map(([id, h]) => ({
            label: h[0],
            value: id,
            description: `${h[1]} players`
          }))
        );

      return i.reply({
        content: "🏢 **THE SYNDICATE — HEISTS**",
        components: [
          new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
      });
    }

    // CREATE HEIST
    if (i.isStringSelectMenu() &&
        i.customId === "select_heist") {

      const h = heists[i.values[0]];
      const id = `${i.user.id}-${Date.now()}`;

      active.set(id, {
        id,
        name: h[0],
        max: h[1],
        host: i.user.id,
        players: [i.user.id]
      });

      const data = active.get(id);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`join_${id}`)
          .setLabel("JOIN HEIST")
          .setEmoji("🎮")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`setup_${id}`)
          .setLabel("SETUPS")
          .setEmoji("⚙️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`finale_${id}`)
          .setLabel("FINALE")
          .setEmoji("🎬")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = makeEmbed(data);

      await i.update({
        content: "✅ Heist created!",
        embeds: [embed],
        components: [row]
      });

      // Broadcast — no @everyone
      return i.channel.send({
        content: `📢 **${h[0]} is looking for players!**`,
        embeds: [embed],
        components: [row],
        allowedMentions: { parse: [] }
      });
    }

    // JOIN
    if (i.isButton() &&
        i.customId.startsWith("join_")) {

      const id = i.customId.slice(5);
      const h = active.get(id);

      if (!h)
        return i.reply({
          content: "❌ Heist no longer exists.",
          ephemeral: true
        });

      if (h.players.includes(i.user.id))
        return i.reply({
          content: "⚠️ You are already in this heist.",
          ephemeral: true
        });

      if (h.players.length >= h.max)
        return i.reply({
          content: "❌ Heist is full.",
          ephemeral: true
        });

      h.players.push(i.user.id);

      await i.reply({
        content:
          `✅ You joined **${h.name}**!\n` +
          `👥 ${h.players.length}/${h.max}`,
        ephemeral: true
      });

      // Update original message
      if (i.message) {
        await i.message.edit({
          embeds: [makeEmbed(h)]
        });
      }

      return;
    }

    // SETUPS
    if (i.isButton() &&
        i.customId.startsWith("setup_")) {

      const id = i.customId.slice(6);
      const h = active.get(id);

      if (!h) return i.reply({
        content: "❌ Heist not found.",
        ephemeral: true
      });

      if (i.user.id !== h.host)
        return i.reply({
          content: "🔒 Only the host can start setups.",
          ephemeral: true
        });

      return i.reply(
        `⚙️ **${h.name} setups started!**\n` +
        `👥 ${h.players.length}/${h.max} players ready.`
      );
    }

    // FINALE
    if (i.isButton() &&
        i.customId.startsWith("finale_")) {

      const id = i.customId.slice(7);
      const h = active.get(id);

      if (!h) return i.reply({
        content: "❌ Heist not found.",
        ephemeral: true
      });

      if (i.user.id !== h.host)
        return i.reply({
          content: "🔒 Only the host can launch the finale.",
          ephemeral: true
        });

      return i.reply(
        `🎬 **${h.name} Finale launched!**\n` +
        `👥 Players:\n` +
        h.players.map((p, n) =>
          `${n + 1}. <@${p}>`
        ).join("\n")
      );
    }
  });

  console.log("✅ Heist plugin loaded.");
};

function makeEmbed(h) {
  return new EmbedBuilder()
    .setTitle(`🏢 ${h.name}`)
    .setDescription(
      `👑 Host: <@${h.host}>\n` +
      `👥 Players: **${h.players.length}/${h.max}**\n\n` +
      h.players.map((p, n) =>
        `${n + 1}. <@${p}>`
      ).join("\n") +
      `\n\n${h.players.length >= h.max
        ? "🟢 **FULL — Ready!**"
        : `🟡 **${h.max - h.players.length} slot(s) available**`}`
    )
    .setFooter({
      text: "THE SYNDICATE • GTA ONLINE"
    });
                  }
