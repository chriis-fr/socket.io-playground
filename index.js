const express = require('express');
const {createServer} = require('node:http');
const {join} = require('node:path');
const {Server} = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function main() {
    //open database file
    const db = await open({
        filename: 'chat.db',
        driver: sqlite3.Database
    });
    //create 'messages' table 
    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    )`)
}

const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {}
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'soco.html'))
});

io.on('connection', async (socket) => {
    socket.on('chat message', async (val) => {
      let result;
      try {
        result = await db.run('INSERT INTO messages (content) VALUES (?)', val);
      } catch (e) {
        // TODO handle the failure
        return;
      }
      io.emit('chat message', val, result.lastID);
    });
  
    if (!socket.recovered) {
      // if the connection state recovery was not successful
      try {
        await db.each('SELECT id, content FROM messages WHERE id > ?',
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit('chat message', row.content, row.id);
          }
        )
      } catch (e) {
        // something went wrong
      }
    }
  });



server.listen(3000, () => {
    console.log('server running at http://localhost:3000')
});