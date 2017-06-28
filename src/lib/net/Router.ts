var server = require('socket.io')(8081);
import DomainInfo from "./DomainInfo";

const domainMap = new Map<string, DomainInfo>();

server.on("connection", function (socket) {

    let id;

    socket.on("init", function (domainInfo: DomainInfo) {
        domainInfo.socket = socket;
        domainMap.set(domainInfo.id, domainInfo);
        id = domainInfo.id;
    });

    socket.on("getDomainByActorId", function (actorId: string, callback) {
        for (let domain of domainMap.values()) {
            if (domain.id === id) continue;
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
