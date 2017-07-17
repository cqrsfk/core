"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server = require("socket.io");
const getActorProxy = Symbol.for("getActorProxy");
class DomainServer {
    constructor(domain, port) {
        const io = server();
        io.on("connection", function (socket) {
            socket.on("call", async function (type, id, sagaId, key, methodName, args, callback) {
                let actor = await domain[getActorProxy](type, id, sagaId, key);
                if (actor) {
                    try {
                        let result = await actor[methodName](...args);
                        callback(null, result);
                    }
                    catch (err) {
                        callback(err.message);
                    }
                }
                else {
                    callback("no actor , id = " + id);
                }
            });
            socket.on("getActor", function (type, id, callback) {
                domain.get(type, id).then(function (actor) {
                    callback(actor.json);
                });
            });
        });
        io.listen(port);
    }
}
exports.default = DomainServer;
//# sourceMappingURL=DomainServer.js.map