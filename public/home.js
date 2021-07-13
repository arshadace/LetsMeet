var create = document.getElementById("create");
var join = document.getElementById("join");
var input = document.getElementById("roomId");
var form = document.querySelector(".form-inline");
var roomId;

//Stop reloading page on submit
form.onsubmit = (event) => {
  event.preventDefault();
};

join.onclick = () => {
  roomId = document.getElementById("roomId").value;
  window.location.href = `/${roomId}`;
};

if (auth === "false") {
  document.getElementById("close-alert").onclick = () => {
    document.querySelector(".home-alert").classList.add("d-none");
    document.querySelector(".home-alert").classList.remove("d-flex");
  };
}

input.onfocus = () => {
  join.classList.remove("d-none");
};

input.onblur = () => {
  if (document.getElementById("roomId").value === "")
    join.classList.add("d-none");
};

input.onkeyup = () => {
  join.disabled = false;
  join.style.color = "white";
  if (document.getElementById("roomId").value === "") join.disabled = true;
};

window.addEventListener(
  "load",
  function () {
    var forms = document.getElementsByClassName("needs-validation");
    var validation = Array.prototype.filter.call(forms, function (form) {
      form.addEventListener(
        "submit",
        function (event) {
          if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
          }
          form.classList.add("was-validated");
        },
        false
      );
    });
  },
  false
);
