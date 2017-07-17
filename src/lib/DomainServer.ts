import * as server from "socket.io";
import Domain from "./Domain";
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
const getActorProxy = Symbol.for("getActorProxy");

export default class DomainServer {


    constructor(domain: Domain, port: number) {

        const io = server();

        io.on("connection", function (socket: SocketIOClient.Socket) {

            socket.on("call", async function (type, id, sagaId, key, methodName, args, callback) {
                let actor = await domain[getActorProxy](type, id, sagaId, key);
                if (actor) {
                    try {
                        let result = await actor[methodName](...args);
                        callback(null, result);
                    } catch (err) {
                        callback(err.message);
                    }
                } else {
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