/**
 * Example Parax Bot
 */
const { ParaxBot } = require("./index");

const bot = new ParaxBot({
  apiKey: "AIzaSyDummyKeyForParaxBotExample",
  authEmail: "bot@parax.com",
  authPassword: "securebotpassword",
  botName: "AssistantBot"
});

bot.on("ready", (b) => {
  console.log(`🤖 Bot is online and listening for messages!`);
});

bot.on("message", async (msg) => {
  console.log(`[Message in #${msg.channelId}] ${msg.senderName}: ${msg.text}`);

  if (msg.text === "!ping") {
    await msg.reply("Pong! 🏓 Parax Bot SDK is working perfectly.");
  }

  if (msg.text === "!help") {
    await msg.reply("Available commands: `!ping`, `!help`, `!info`");
  }

  if (msg.text === "!info") {
    await msg.reply("I am an automated assistant bot powered by Parax Bot SDK.");
  }
});

// To run:
// bot.login().catch(console.error);
console.log("ParaxBot example script loaded. Configure credentials and call bot.login() to start.");
