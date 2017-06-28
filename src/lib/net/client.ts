const io = require("socket.io-client");
const socket = io("http://localhost:8081");
socket.on("connect", function () {
    socket.emit("getDomainByActorId", "hhh id", function (data) {
        console.log(data)
    })
});