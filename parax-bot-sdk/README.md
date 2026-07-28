# Parax Bot SDK 🤖

Official Node.js SDK for building custom bots and automated integrations on the Parax chat platform.

## Installation

```bash
npm install parax-bot-sdk
```

## Quick Start

```javascript
const { ParaxBot } = require("parax-bot-sdk");

const bot = new ParaxBot({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authEmail: "your-bot@parax.com",
  authPassword: "your-bot-password",
  botName: "MyBot"
});

bot.on("ready", (b) => {
  console.log(`Bot connected as ${b.user.email}`);
});

bot.on("message", async (msg) => {
  if (msg.text === "!hello") {
    await msg.reply("Hello from Parax Bot! 👋");
  }
});

bot.login();
```

## API Reference

- `new ParaxBot(config)`: Initialize bot with Firebase credentials and bot name.
- `bot.login()`: Authenticate bot user against Parax backend.
- `bot.on(event, callback)`: Listen to events (`ready`, `message`).
- `bot.sendMessage(channelId, text)`: Send a text message to a specific channel.
- `msg.reply(text)`: Reply directly to the message channel.
