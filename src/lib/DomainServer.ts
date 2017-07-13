import * as server from "socket.io";
import { EventEmitter } from "events";
import DomainProxy from "./DomainProxy";
import Domain from "./Domain";
import Repository from "./Repository";

export default class DomainServer {

    private repos: Repository[];

    constructor(domain: Domain, port: number, url: string, proxy?: DomainProxy) {

        this.repos = [...domain.repositorieMap.values()];

        const io = server();

        io.on("connection", function (socket: SocketIOClient.Socket) {


            socket.on("getActorIds", function (callback) {
                const result = [];
                for (let [info, ids] of proxy.domainMap) {
                    result.push({ info, ids })
                }
                const ids = domain.getCacheActorIds();
                result.push({ info: { url, id: domain.id }, ids });
                callback(result);
            });

            socket.on("getActor", function (type, id, callback) {
                domain.get(type, id).then(function (actor) {
                    callback(actor.json);
                })
            });

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

            for (let r of this.repos) {
                r.on("clear", function (actorId) {
                    socket.emit("remove", actorId);
                });

                r.on("create", function (json) {
                    socket.emit("add", domain.id, json.id);
                });

                r.on("reborn", function (id) {
                    socket.emit("add", domain.id, id);
                })
            }

            socket.on("getDomainId", function (domainId) {
                proxy.addSocket(domainId, socket);
            });

        });


        io.listen(port);

    }
}