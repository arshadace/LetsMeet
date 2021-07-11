var divConsultRoom = document.getElementById("consultingRoom");
var myVideo = document.createElement("video");
var endCall = document.getElementById("end-call");
var messages = document.querySelector(".chat-area");
var chat = document.getElementById("chats");
var userName = "default";
var stream;

$(".chat-header-button").on("click", function () {
  startVideoChat();
  $(".app-videos").removeClass("d-none");
  $(".chat-sec").addClass("chat-sec-in");
  $("#chat-btn").addClass("act-red");
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

$(".send-button").click(emitMessage);

function emitMessage() {
  var $input = $(".chat-input");
  var msg = $input.val();
  socket.emit("message", msg, socket.id);

  addMsg(msg, socket.id);
  $input.val(null);
}

var peers = [];
var peersObj = [];
var streamConstraints = { audio: true, video: true };
var socket = io();
var userToName = {};

//Normal chat group
socket.emit("join team", roomNumber, userName);

//Recieve messages
socket.on("messaged", (msg, id) => {
  addMsg(msg, id);
});

function addMsg(msg, id) {
  var m = createCard(msg, id);
  messages.appendChild(m);
}

function createCard(msg, id) {
  const card = `<div class = "message-content">
     <p class = "name"> ${id} </p>
     <p class = "message">${msg}</p>
      </div> `;

  var c = document.createElement("div");
  c.innerHTML = card;
  c.classList.add("message-wrapper");
  if (id === socket.id) c.classList.add("reverse");
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
    divConsultRoom.appendChild(div);
    //Various signaling and adding remote peers
    socket.emit("join room", roomNumber + "-video", userName);
  });
}

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
