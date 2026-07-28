package com.parax.bot;

@FunctionalInterface
public interface MessageListener {
    void onMessage(Message message);
}
