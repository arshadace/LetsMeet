var create = document.getElementById("create");

var join = document.getElementById("join");

var input = document.getElementById("roomId");

var myVideo = document.getElementById("myVideo");

var form = document.querySelector("form");

//Stop reloading page on submit
form.onsubmit = (event) => {
  event.preventDefault();
};

var roomId;

create.onclick = () => {
  roomId = Math.floor(Math.random() * 10000 + 1);
  window.location.href = `/${roomId}`;
};

join.onclick = () => {
  roomId = document.getElementById("roomId").value;
  window.location.href = `/${roomId}`;
};

input.onclick = () => {
  join.classList.remove("d-none");
};

input.onkeyup = () => {
  join.disabled = false;
  join.style.color = "green";
};

navigator.mediaDevices
  .getUserMedia({ audio: true, video: true })
  .then((stream) => {
    myVideo.srcObject = stream;
    myVideo.play();
  })
  .catch((err) => {
    myVideo.innerHTML = "Sorry problem connecting media devices";
    console.log(err);
  });
