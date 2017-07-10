import * as server from "socket.io";
import * as io from "socket.io-client";
import { EventEmitter } from "events";
const uid = require("uuid").v1;

export default class DomainProxy extends EventEmitter {

    private socket: SocketIOClient.Socket;
    private _id: string;
    private isURL: boolean;
    private _connected: boolean;
    private actorIds: Set<string>;
    private initialized: boolean = false;

    constructor(public readonly url: any) {
        super();
        const that = this;
        this._id = uid();
        this.isURL = typeof url === "string";
        this.socket = this.isURL ? io(url) : url;
        if (this.isURL) {
            this.socket.on("connect", () => {
                this._connected = true;
                this.emit("connected");
            });
        } else {
            this._connected = true;
        }

        this.socket.on("remove", function (actorId) {
            that.actorIds.delete(actorId);
        });

        this.socket.on("add", function (actorId) {
            that.actorIds.add(actorId);
        });
    }

    private init() {
        this.socket.emit("getActorIds", (actorIds: string[]) => {
            this.actorIds = new Set(actorIds);
            this.initialized = true;
            this.emit("initialized");
        })
    }

    async refresh() {
        new Promise(function (resolve, reject) {
            this.socket.emit("getActorIds", (actorIds: string[]) => {
                this.actorIds = new Set(actorIds);
                resolve();
            });
        })
    }

    has(actorId) {
        return this.actorIds.has(actorId);
    }

    get id(): string {
        return this._id;
    }

    get connected(): boolean {
        return this._connected;
    }

    async getActor(type, id) {
        const that = this;
        return new Promise(function (resolve, reject) {
            that.socket.emit("getActor", type, id, function (actorInfo) {
                if (actorInfo) {
                    resolve(new Proxy(null, {

                        get(target, prop) {
                            if (prop === "json") {
                                return actorInfo;
                            } else if (prop === "refresh") {
                                return new Promise(function () {
                                    that.socket.emit("getActor", type, id, function (_actorInfo) {
                                        actorInfo = _actorInfo;
                                        resolve(actorInfo);
                                    });
                                })
                            } else {
                                return new Proxy(null, {
                                    apply(target, cxt, args) {
                                        return new Promise(function () {
                                            that.socket.emit("call", type, id, prop, args, function (result) {
                                                resolve(result);
                                            })
                                        })
                                    }
                                })
                            }
                        }

                    }));
                } else {
                    resolve(null);
                }
            })
        })
    }
}

