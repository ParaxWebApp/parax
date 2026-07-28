/**
 * Parax Bot SDK 🤖
 * Official SDK to build and run automated bots for Parax servers.
 */

const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");

class ParaxBot {
  constructor(config) {
    if (!config || !config.apiKey || !config.authEmail || !config.authPassword) {
      throw new Error("[ParaxBot] Configuration missing: apiKey, authEmail, and authPassword are required.");
    }

    this.config = config;
    this.app = null;
    this.db = null;
    this.auth = null;
    this.user = null;
    this._listeners = {
      ready: [],
      message: [],
      memberJoin: []
    };
    this._messageCache = new Set();
  }

  async login() {
    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp({
          apiKey: this.config.apiKey,
          authDomain: this.config.authDomain || "webappparax.firebaseapp.com",
          projectId: this.config.projectId || "webappparax"
        });
      } else {
        this.app = firebase.app();
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();

      const cred = await this.auth.signInWithEmailAndPassword(this.config.authEmail, this.config.authPassword);
      this.user = cred.user;

      console.log(`[ParaxBot] Logged in successfully as ${this.user.email} (${this.user.uid})`);
      
      this._trigger("ready", this);
      this._startListeners();
    } catch (err) {
      console.error("[ParaxBot] Login failed:", err);
      throw err;
    }
  }

  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
  }

  _trigger(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  }

  _startListeners() {
    // Listen to messages across channels in real-time
    this.db.collection("messages")
      .orderBy("timestamp", "desc")
      .limit(20)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            const data = change.doc.data();
            const msgId = change.doc.id;

            // Avoid processing own messages or duplicate triggers
            if (data.senderId === this.user.uid) return;
            if (this._messageCache.has(msgId)) return;
            
            this._messageCache.add(msgId);
            if (this._messageCache.size > 500) {
              const firstVal = this._messageCache.values().next().value;
              this._messageCache.delete(firstVal);
            }

            const message = {
              id: msgId,
              channelId: data.channelId,
              text: data.text,
              senderId: data.senderId,
              senderName: data.senderName || "Unknown",
              timestamp: data.timestamp,
              reply: async (text) => {
                return await this.sendMessage(data.channelId, text);
              }
            };

            this._trigger("message", message);
          }
        });
      }, err => {
        console.error("[ParaxBot] Message listener error:", err);
      });
  }

  async sendMessage(channelId, text) {
    if (!this.db) throw new Error("Bot not initialized. Call login() first.");
    
    const messageRef = await this.db.collection("messages").add({
      channelId: channelId,
      text: text,
      senderId: this.user.uid,
      senderName: this.config.botName || "ParaxBot",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    return messageRef.id;
  }
}

module.exports = { ParaxBot };
