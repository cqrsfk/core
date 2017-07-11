import * as server from "socket.io";
import { EventEmitter } from "events";
import DomainProxy from "./DomainProxy";
import Domain from "./Domain";
import Repository from "./Repository";

export default class DomainServer {

    private repos: Repository[];

    constructor(domain: Domain, repos: Repository[]) {
        this.repos = repos;

        // only test  TODO
        const io = server();
        
        io.on("connection", function (socket: SocketIOClient.Socket) {
            console.log("hahahhahah");
            const domainProxy = new DomainProxy(socket);

            domainProxy.on("getActorIds", function (callback) {
                callback(domain.getCacheActorIds());
            });

            domainProxy.on("getActor", function (type, id, callback) {
                domain.get(type, id).then(function (actor) {
                    callback(actor.json);
                })
            });

            domainProxy.on("call", async function (type, id, methodName, args, callback) {
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

            for (let r of repos) {
                r.on("clear", function (actorId) {
                    domainProxy.emit("remove", actorId);
                });

                r.on("create", function (json) {
                    domainProxy.emit("add", json.id);
                })
            }
        });

        io.listen(3002);


    }
}