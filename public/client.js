var divConsultRoom = document.getElementById("consultingRoom");
var myVideo = document.createElement("video");
var endCall = document.getElementById("end-call");
var messages = document.querySelector(".chat-area");
var chat = document.getElementById("chats");
var stream;
var peers = [];
var peersObj = [];
var streamConstraints = { audio: true, video: true };
var socket = io();
var userToName = {};

$(".chat-header-button").on("click", function () {
  startVideoChat();
  $(".app-videos").removeClass("d-none");
  $("#mic").removeClass("act-red");
  $("#videocam").removeClass("act-red");
  $(".chat-sec").addClass("chat-sec-in");
  $(".chat-sec").addClass("d-none");
  $(this).addClass("d-none");
});

$("#mic").on("click", function () {
  var $thisbutton = $(this);
  if ($thisbutton.find("span").text() === "mic") {
    $thisbutton.find("span").text("mic_off");
  } else $thisbutton.find("span").text("mic");

  $thisbutton.toggleClass("act-red");
  toggleTrack(stream, "audio");
});

$("#videocam").on("click", function () {
  var $thisbutton = $(this);
  if ($thisbutton.find("span").text() === "videocam") {
    $thisbutton.find("span").text("videocam_off");
  } else $thisbutton.find("span").text("videocam");

  $thisbutton.toggleClass("act-red");
  toggleTrack(stream, "video");
});

$("#chat-btn").on("click", function () {
  $(this).toggleClass("act-red");
  $(".chat-sec").toggleClass("d-none");
});

endCall.onclick = () => {
  $(".chat-header-button").removeClass("d-none");
  socket.emit("leave meet", socket.id);
  $(".chat-sec").removeClass("chat-sec-in");
  $(".chat-sec").removeClass("d-none");
  myVideo.srcObject.getTracks().forEach((track) => track.stop());
  myVideo.srcObject = null;
  $("#consultingRoom").empty();
  $(".app-videos").addClass("d-none");
};

//Sending Message
$(".send-button").click(emitMessage);
$(".chat-input").keypress(function (event) {
  if (event.which === 13) emitMessage();
});

function emitMessage() {
  var $input = $(".chat-input");
  var msg = $input.val();
  if (msg !== "" && msg !== null && msg !== undefined) {
    socket.emit("message", msg);

    addMsg(msg, userName, true);
    $input.val(null);
  }
}

//Normal chat group
socket.emit("join team", roomNumber, userName);

socket.on("all chats", (chats) => {
  chats.forEach((chat) => {
    addMsg(chat.msg, chat.name, chat.name === userName);
  });
});
//Recieve messages
socket.on("messaged", (msg, name) => {
  addMsg(msg, name, false);
});

function addMsg(msg, name, reverse) {
  var m = createCard(msg, name, reverse);
  messages.appendChild(m);
  messages.lastElementChild.scrollIntoView();
}

function createCard(msg, name, reverse) {
  const card = `<div class = "message-content">
     <p class = "name"> ${name} </p>
     <p class = "message">${msg}</p>
      </div> `;

  var c = document.createElement("div");
  c.innerHTML = card;
  c.classList.add("message-wrapper");
  if (reverse) c.classList.add("reverse");
  return c;
}

//Realted to Video Meet
function startVideoChat() {
  peers = [];
  peersObj = [];
  navigator.mediaDevices.getUserMedia(streamConstraints).then((s) => {
    //Adding own stream-video
    stream = s;
    myVideo.srcObject = stream;
    myVideo.muted = true;
    myVideo.autoplay = true;
    myVideo.id = socket.id;
    var div = document.createElement("div");
    div.className = "video-participant";
    div.appendChild(myVideo);
    var nametag = document.createElement("span");
    nametag.innerHTML = `${userName} (You)`;
    nametag.className = "name-tag";
    div.appendChild(nametag);
    divConsultRoom.appendChild(div);

    //Emit Join Room to get other user's info
    socket.emit("join room", roomNumber + "-video", userName);
  });
}

//Connect to other users
socket.on("all users", (users, names) => {
  userToName = names;
  users.forEach((userID) => {
    const peer = createPeer(userID, socket.id, stream);
    peersObj.push({
      peerID: userID,
      peer,
    });
    peers.push(peer);
  });
});

socket.on("user joined", (payload) => {
  addToast(payload.userName);
  userToName[payload.callerID] = payload.userName;
  const peer = addPeer(payload.signal, payload.callerID, stream);
  peersObj.push({
    peerID: payload.callerID,
    peer,
  });
  peers.push(peer);
});

socket.on("receiving returned signal", (payload) => {
  const item = peersObj.find((p) => p.peerID === payload.id);
  item.peer.signal(payload.signal);
});

socket.on("user left", (id) => {
  var $vid = $("#" + id)
    .parent()
    .remove();
  let _peer = peersObj.find((p) => p.peerID === id);
  let _peers = peersObj;
  peersObj = _peers.filter((p) => p.peerID !== id);
  peers = peers.filter((p) => p !== _peer.peer);
  _peer.peer.destroy();
});

//Some Useful functions
function createPeer(userToSignal, callerID, stream) {
  const peer = new SimplePeer({
    initiator: true,
    trickle: false,
    stream,
  });

  peer.on("signal", (signal) => {
    socket.emit("sending signal", {
      userToSignal,
      callerID,
      signal,
      userName,
    });
  });

  peer.on("stream", (stream) => {
    addVideo(userToSignal, stream);
  });

  return peer;
}

function addPeer(incomingSignal, callerID, stream) {
  const peer = new SimplePeer({
    initiator: false,
    trickle: false,
    stream,
  });

  peer.on("signal", (signal) => {
    socket.emit("returning signal", { signal, callerID });
  });

  peer.signal(incomingSignal);

  peer.on("stream", (stream) => {
    addVideo(callerID, stream);
  });

  return peer;
}

function addVideo(callerID, stream) {
  var video = document.createElement("video");
  video.id = callerID;
  video.autoplay = true;
  video.srcObject = stream;

  var div = document.createElement("div");
  div.className = "video-participant";

  div.appendChild(video);

  var nametag = document.createElement("span");
  nametag.innerHTML = userToName[callerID];
  nametag.className = "name-tag";

  div.appendChild(nametag);
  divConsultRoom.appendChild(div);
}

function toggleTrack(stream, type) {
  stream.getTracks().forEach((track) => {
    if (track.kind === type) {
      track.enabled = !track.enabled;
    }
  });
  myVideo.srcObject = stream;
  if (type === "video") {
    peers.forEach((peer) => {
      peer.replaceTrack(
        peer.streams[0].getVideoTracks()[0],
        stream.getVideoTracks()[0],
        peer.streams[0]
      );
    });
  } else {
    peers.forEach((peer) => {
      peer.replaceTrack(
        peer.streams[0].getAudioTracks()[0],
        stream.getAudioTracks()[0],
        peer.streams[0]
      );
    });
  }
}

function addToast(name) {
  var div = document.createElement("div");
  div.className = "snackbar d-flex align-items-center";
  // $("#toasts").empty();
  div.innerHTML = `${name} Joined the meet`;
  document.getElementById("toasts").appendChild(div);
  setTimeout(() => {
    $("#toasts").empty();
  }, 2000);
}
