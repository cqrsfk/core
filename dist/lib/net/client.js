"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
function createClient(data) {
    const socket = io("http://localhost:8081");
    socket.on("connect", function () {
        socket.emit("init", data, function (result) {
            const map = new Map(result);
            for (let [k, v] of map) {
                console.log(v.actorIds);
            }
        });
    });
}
createClient({
    id: "001",
    ip: "localhost",
    port: 9001,
    actorIds: ["001", "002"]
});
setTimeout(function () {
    createClient({
        id: "002",
        ip: "localhost",
        port: 9002,
        actorIds: ["003", "004"]
    });
}, 1000);
//# sourceMappingURL=client.js.map