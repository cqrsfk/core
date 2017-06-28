"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var server = require('socket.io')(8081);
const domainMap = new Map();
server.on("connection", function (socket) {
    let id;
    socket.on("init", function (domainInfo) {
        domainInfo.socket = socket;
        domainMap.set(domainInfo.id, domainInfo);
        id = domainInfo.id;
    });
    socket.on("getDomainByActorId", function (actorId, callback) {
        for (let domain of domainMap.values()) {
            if (domain.id === id)
                continue;
            if (domain.actorIds.includes(domain.id)) {
                callback(domain.id);
                return;
            }
        }
        callback();
    });
    socket.on("addActorId", function (actorId) {
        domainMap.get(id).actorIds.push(actorId);
    });
    socket.on("removeActorId", function (actorId) {
        const actorIds = new Set(domainMap.get(id).actorIds);
        actorIds.delete(actorId);
        domainMap.get(id).actorIds = Array.from(actorIds);
    });
});
//# sourceMappingURL=Router.js.map