/** Functionality related to chatting. */
const fetch = require("node-fetch");

// Room is an abstraction of a chat channel
const Room = require('./Room');

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
    if (this.room.name === 'joke') {
      var url = "https://icanhazdadjoke.com/";
      var options = {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        }
      };
      fetch(url, options)
        .then(res => res.json())
        .then(data => 
          this.room.broadcast({
            type: 'note',
            text: data.joke
          }))
        .catch(e => console.log(e))
    }
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
      this.room.broadcast({
        name: this.name,
        type: 'chat',
        text: text
      });
    if (text === '/members') {
      this.room.members.forEach(member => 
        this.room.broadcast({
        name: this.name,
        type: 'chat',
        text: member.name
      }))
    }
}


  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'chat') this.handleChat(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
