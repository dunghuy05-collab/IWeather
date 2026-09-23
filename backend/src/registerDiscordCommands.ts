import { tripCommandDefinition } from "./discordInteractions.js";

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are required.");
  process.exit(1);
}

const route = guildId
  ? `applications/${applicationId}/guilds/${guildId}/commands`
  : `applications/${applicationId}/commands`;

const response = await fetch(`https://discord.com/api/v10/${route}`, {
  method: "PUT",
  headers: {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify([tripCommandDefinition]),
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

console.log(`Registered /trip ${guildId ? "guild" : "global"} command.`);
