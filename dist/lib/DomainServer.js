"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server = require("socket.io");
class DomainServer {
    constructor(domain, port, url, manager) {
        manager.register({ id: domain.id, url });
        const io = server();
        io.on("connection", function (socket) {
            socket.on("call", async function (type, id, methodName, args, callback) {
                let actor = await domain.get(type, id);
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
                    // console.log(actor.json);
                    callback(actor.json);
                });
            });
        });
        io.listen(port);
    }
}
exports.default = DomainServer;
//# sourceMappingURL=DomainServer.js.map