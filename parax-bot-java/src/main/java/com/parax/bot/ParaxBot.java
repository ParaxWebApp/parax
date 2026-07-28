package com.parax.bot;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

public class ParaxBot {
    private String token;
    private String baseUrl;
    private String wsUrl;
    private List<MessageListener> listeners = new ArrayList<>();
    private WebSocketClient client;

    public ParaxBot(String token) {
        this.token = token;
        this.baseUrl = "https://parax-vqqb.onrender.com/api";
        this.wsUrl = "wss://parax-vqqb.onrender.com";
    }

    public void onMessage(MessageListener listener) {
        this.listeners.add(listener);
    }

    public void start() {
        try {
            URI uri = new URI(wsUrl + "?token=" + token);
            client = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshakedata) {
                    System.out.println("[ParaxBot Java] Connected to Gateway successfully!");
                }

                @Override
                public void onMessage(String message) {
                    try {
                        JsonObject obj = JsonParser.parseString(message).getAsJsonObject();
                        if (obj.has("type") && obj.get("type").getAsString().equals("MESSAGE_CREATE")) {
                            JsonObject data = obj.getAsJsonObject("data");
                            Message msg = new Message(
                                data.has("id") ? data.get("id").getAsString() : "",
                                data.has("content") ? data.get("content").getAsString() : (data.has("text") ? data.get("text").getAsString() : ""),
                                data.has("senderId") ? data.get("senderId").getAsString() : "",
                                data.has("senderName") ? data.get("senderName").getAsString() : "",
                                data.has("channelId") ? data.get("channelId").getAsString() : "",
                                data.has("serverCode") ? data.get("serverCode").getAsString() : "",
                                ParaxBot.this
                            );
                            for (MessageListener listener : listeners) {
                                listener.onMessage(msg);
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("[ParaxBot Java] Error parsing message: " + e.getMessage());
                    }
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    System.out.println("[ParaxBot Java] Connection closed. Reconnecting...");
                    try { Thread.sleep(5000); } catch (InterruptedException ignored) {}
                    start();
                }

                @Override
                public void onError(Exception ex) {
                    System.err.println("[ParaxBot Java] Error: " + ex.getMessage());
                }
            };
            client.connect();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void sendMessage(String serverCode, String channelId, String text) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost request = new HttpPost(baseUrl + "/messages");
            request.setHeader("Content-Type", "application/json");
            request.setHeader("Authorization", "Bearer " + token);

            JsonObject json = new JsonObject();
            json.addProperty("serverCode", serverCode);
            json.addProperty("channelId", channelId);
            json.addProperty("text", text);

            request.setEntity(new StringEntity(json.toString()));
            httpClient.execute(request);
        } catch (Exception e) {
            System.err.println("[ParaxBot Java] Failed to send message: " + e.getMessage());
        }
    }
}
