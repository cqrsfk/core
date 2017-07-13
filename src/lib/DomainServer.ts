import * as server from "socket.io";
import Domain from "./Domain";
import DefaultCluterInfoManager from "./DefaultCluterInfoManager";

export default class DomainServer {


    constructor(domain: Domain, port: number, url: string, manager: DefaultCluterInfoManager) {

        const io = server();

        io.on("connection", function (socket: SocketIOClient.Socket) {

            manager.register({ domainId: domain.id, url });

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

        });


        io.listen(port);

    }
}