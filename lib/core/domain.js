const Repository = require("./Repository");
const EventStore = require("./EventStore");
const EventBus = require("./EventBus");
const di = require("class-di");
const mdi = require("method-cxt-di");
const io = require("socket.io");
const ioclient = require('socket.io-client');
const DomainProxy = require("./DomainProxy");
const url = require("url");
const Actors = {};
const repos = {};

let server = null;
let isMaster = false;
// let selfDomainData = null;
const domainDataMap = new Map();

function getLatestClass(Classes) {
    let latestVesion = Object.keys(Classes).sort().pop();
    return Classes[latestVesion];
}

// todo
const services = {
    lock(id) { },
    unlock(id) { },
    get(id) { },
    apply(eventType, data) { },
    subscribe() { },
    subscribeOnce() {

    },
    unSubscribe() {

    }
}

// TODO must implements
async function get() {
    // get location actor or get remote actor proxy
    return new Proxy({}, {}); // need implements
}

module.exports = {
    register(...ActorClasses) {
        for (let ActorClass of ActorClasses) {
            ActorClass = di(ActorClass, function serviceProvider(method, cxt, args, methodname, Class, newArgs) {
                return { services }
            });
            ActorClass = mdi(ActorClass, function serviceProvider(method, cxt, args, methodname) {
                if (methodname === "createBefor") {
                    return {
                        services
                    }
                } else {
                    return null;
                }
            });
            let version = ActorClass.version;
            let ActorClasses = Actors[ActorClass.getType()] || {};
            ActorClasses[ActorClass.version] = ActorClass;
            Actors[ActorClass.getType()] = ActorClasses;
            repos[ActorClass.getType()] = new Repository(ActorClass, this[eventstore], ActorClasses, this);
        }
        return this;
    },

    // TODO : Repository must implements create event store.
    async create(type, data) {
        let repo = repos[type];
        let Classes = Actors[actorType];
        let Class = getLatestClass(Classes);
        if (Class.createBefor) {
            try {
                let result = await Class.createBefor(data);
            } catch (err) {
                throw err;
            }
        }
        return await repo.create(data);
    },

    async get(id) {
        let actor = await get(id);
        if (actor) {
            return new Proxy({}, {
                get(target, prop) {
                    if (prop === "json") {
                        return actor.json;
                    }
                    if (actor.hasOwnProperty(props)) {
                        return async function () {
                            return actor[prop](...arguments);
                        }
                    }
                }
            });
        } else {
            return null;
        }
    },

    async remove(id) {
        let actor = this.get(id);
        if (actor) {
            actor.remove();
        }
    },

    master() {
        isMaster = true;
    },

    start(id, url, port) {
        // selfDomainData = new DomainProxy(id, url, port);
        server = io(port);

        server.on("connection", function (socket) {
            socket.on("register", register);
            if (isMaster) {
                socket.emit("teach", domainDataMapToJSON())
            } else {
                socket.on("teach", teach);
            }
        });
    }

}

function domainDataMapToJSON() {
    return [...domainDataMap.entries()].map(data => {
        let { id, url, port } = data;
        return { id, url, port, actorIdSet: [...data.actorIdSet] }
    });
}

function register(data) {
    let { id, url, port } = data;
    let domainData = new DomainProxy(id, url, port);
    if (!domainDataMap.has(id)) {
        domainDataMap.set(id, domainData);
    }
}

async function teach(otherDomainData) {
    domainDataMap.clear();
    for (let data of otherDomainData) {
        let { id, url, port, actorIdSet } = data;
        let domainData = new DomainProxy(id, url, port, actorIdSet);
        let socket = createDomainSocket(url.port);
        domainData.setSocket(socket);
        domainDataMap.set(id, domainData);
    }
}

function createDomainSocket(url, port) {
    let address = url.format({ host: "127.0.0.1", protocol: "http" });
    let socket = ioclient(address);
    return new Promise((resolve, reject) => {
        socket.on("connect", function () {
            resolve(socket);
        });
    });
}

function selfIntroduction() {
    // push self info to other domain
    // let socket = ioc(domainData.domainInfo.url);
    // socket.on("connect", function () {
    //     socket.emit("register", { domainInfo: selfDomainData.domainInfo });
    // })
}