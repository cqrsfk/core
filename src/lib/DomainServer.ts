import * as server from "socket.io";
import Domain from "./Domain";
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";

export default class DomainServer {


    constructor(domain: Domain, port: number, url: string, manager: DefaultClusterInfoManager) {

        manager.register({ id: domain.id, url });

        const io = server();

        io.on("connection", function (socket: SocketIOClient.Socket) {


            socket.on("call", async function (type, id, methodName, args, callback) {
                let actor = await domain.get(type, id);
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
                    // console.log(actor.json);
                    callback(actor.json);
                });
            });


        });


        io.listen(port);

    }
}