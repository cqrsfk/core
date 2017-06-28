"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const socket = socket_io_client_1.default('http://localhost');
socket.on('connect', function () { });
socket.on('event', function (data) { });
socket.on('disconnect', function () { });
//# sourceMappingURL=net.js.map