package com.parax.bot;

public class Message {
    private String id;
    private String content;
    private String senderId;
    private String senderName;
    private String channelId;
    private String serverCode;
    private ParaxBot bot;

    public Message(String id, String content, String senderId, String senderName, String channelId, String serverCode, ParaxBot bot) {
        this.id = id;
        this.content = content;
        this.senderId = senderId;
        this.senderName = senderName;
        this.channelId = channelId;
        this.serverCode = serverCode;
        this.bot = bot;
    }

    public String getId() { return id; }
    public String getContent() { return content; }
    public String getSenderId() { return senderId; }
    public String getSenderName() { return senderName; }
    public String getChannelId() { return channelId; }
    public String getServerCode() { return serverCode; }

    public void reply(String text) {
        if (bot != null) {
            bot.sendMessage(serverCode, channelId, text);
        }
    }
}
