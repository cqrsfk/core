import io from 'socket.io-client';
const socket = io('http://localhost');
socket.on('connect', function () { });
socket.on('event', function (data) { });
socket.on('disconnect', function () { });