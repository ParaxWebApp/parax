import asyncio
import json
import aiohttp
import websockets

class Message:
    def __init__(self, data, bot):
        self.id = data.get("id")
        self.content = data.get("content") or data.get("text", "")
        self.sender_id = data.get("senderId")
        self.sender_name = data.get("senderName")
        self.channel_id = data.get("channelId")
        self.server_code = data.get("serverCode")
        self.timestamp = data.get("timestamp")
        self._bot = bot

    async def reply(self, text):
        return await self._bot.send_message(self.server_code, self.channel_id, text)

class Bot:
    def __init__(self, token, base_url="https://parax-vqqb.onrender.com/api", ws_url="wss://parax-vqqb.onrender.com"):
        if not token:
            raise ValueError("ParaxBot: Bot token is required")
        self.token = token
        self.base_url = base_url
        self.ws_url = ws_url
        self.message_handlers = []

    def on_message(self):
        def decorator(func):
            self.message_handlers.append(func)
            return func
        return decorator

    async def send_message(self, server_code, channel_id, text):
        async with aiohttp.ClientSession() as session:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
            payload = {
                "serverCode": server_code,
                "channelId": channel_id,
                "text": text
            }
            async with session.post(f"{self.base_url}/messages", json=payload, headers=headers) as resp:
                data = await resp.json()
                if resp.status >= 400:
                    raise Exception(data.get("error", "Failed to send message"))
                return data

    async def _connect_gateway(self):
        uri = f"{self.ws_url}?token={self.token}"
        while True:
            try:
                async with websockets.connect(uri) as websocket:
                    print("[ParaxBot] Connected to Gateway successfully!")
                    async for raw_msg in websocket:
                        try:
                            packet = json.loads(raw_msg)
                            if packet.get("type") == "MESSAGE_CREATE":
                                msg = Message(packet.get("data", {}), self)
                                for handler in self.message_handlers:
                                    asyncio.create_task(handler(msg))
                        except Exception as e:
                            print(f"[ParaxBot] Error processing message: {e}")
            except Exception as e:
                print(f"[ParaxBot] Gateway connection lost: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    def run(self):
        try:
            asyncio.run(self._connect_gateway())
        except KeyboardInterrupt:
            print("[ParaxBot] Bot stopped by user.")
