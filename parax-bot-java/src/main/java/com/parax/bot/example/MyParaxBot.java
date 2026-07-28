package com.parax.bot.example;

import com.parax.bot.ParaxBot;

public class MyParaxBot {
    public static void main(String[] args) {
        ParaxBot bot = new ParaxBot("parax_bot_SAMPLE_TOKEN_JAVA");

        bot.onMessage(message -> {
            System.out.println("[" + message.getSenderName() + "]: " + message.getContent());
            if (message.getContent().equalsIgnoreCase("merhaba")) {
                message.reply("Merhaba! Parax Bot Java SDK Phase 3 active ☕");
            }
        });

        System.out.println("Starting Parax Java Bot...");
        // bot.start();
    }
}
