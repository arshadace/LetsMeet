const express = require("express");
const app = express();

const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require("passport-local").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const url =
  "mongodb+srv://admin-surya:a1234567@cluster0.admca.mongodb.net/amsDB?retryWrites=true&w=majority";
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
};

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: "This is our little secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));

const http = require("http").Server(app);
var io = require("socket.io")(http);

mongoose.connect(url, options);

const userSchema = new mongoose.Schema({
  username: String,
  displayname: String,
  password: String,
});

const chatSchema = new mongoose.Schema({
  room: String,
  msg: String,
  name: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  var auth = req.isAuthenticated();
  res.render("home", { user: req.user, auth: auth });
});

app.get("/:roomId", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("room", {
      roomId: req.params.roomId,
      name: req.user.displayname,
      email: req.user.username,
    });
  } else {
    res.redirect("/");
  }
});

app.get("/user/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
  User.register(
    new User({
      username: req.body.username,
      displayname: req.body.displayname,
    }),
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      });
    }
  });
});

const users = {};
const socketToRoom = {};
const socketToName = {};

io.on("connection", (socket) => {
  socket.on("join team", (roomID, name) => {
    socket.join(roomID);
    socket.username = name;
    Chat.find({ room: roomID }, (err, docs) => {
      socket.emit("all chats", docs);
    });

    socket.on("message", (msg) => {
      c = new Chat({ room: roomID, msg: msg, name: socket.username });
      c.save();
      socket.to(roomID).emit("messaged", msg, socket.username);
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
    delete socketToRoom[id];
  });
  socket.on("disconnecting", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room !== undefined && room !== null && room) {
      console.log("emitted dis");
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
