const express = require("express");
const app = express();
const http = require("http").Server(app);
var io = require("socket.io")(http);

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/:roomId", (req, res) => {
  res.render("room", { roomId: req.params.roomId });
});

app.get("/end/call", (req, res) => {
  res.render("leave");
});

const users = {};
const socketToRoom = {};
const socketToName = {};

io.on("connection", (socket) => {
  socket.on("join team", (roomID, name) => {
    socket.join(roomID);
    socket.on("message", (msg, id) => {
      socket.to(roomID).emit("messaged", msg, id);
      // var roomID = socketToRoom[socket.id];
      // const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
      // usersInThisRoom.forEach((user) => {
      //   socket.to(user).emit("messaged", msg, id);
      // });
    });
  });

  socket.on("join room", (roomID, name) => {
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    socketToName[socket.id] = name;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    const names = {};
    usersInThisRoom.forEach((user) => (names[user] = socketToName[user]));
    socket.emit("all users", usersInThisRoom, names);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
      userName: payload.userName,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("leave meet", (id) => {
    const roomID = socketToRoom[id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      //Tell other users to remove the peer which left
      room.forEach((user) => {
        socket.to(user).emit("user left", socket.id);
      });
    }
  });
  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      //Tell other users to remove the peer which left
      room.forEach((user) => {
        socket.to(user).emit("user left", socket.id);
      });
    }
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on ${process.env.PORT || 3000}`);
});
