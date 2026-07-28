from parax_bot_sdk import Bot

bot = Bot(token="parax_bot_SAMPLE_TOKEN_PYTHON")

@bot.on_message()
async def handle_message(message):
    print(f"[{message.sender_name}]: {message.content}")
    if message.content.lower() == "merhaba":
        await message.reply("Merhaba! Parax Bot Python SDK Phase 2 active 🐍")

if __name__ == "__main__":
    print("Starting Parax Python Bot...")
    # bot.run()
