"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
class Repository {
    constructor(ActorClass, eventstore, ActorClasses, domain) {
    }
    async create(data) {
        return Promise.resolve(new Actor_1.Actor());
    }
    async createSnap(actor) {
        // let newSnap = {
        //     id: uuid(),
        //     index: 0,
        //     latestEventIndex: 0,
        //     date: Date.now(),
        //     data: actor._data,
        //     actorId: actor.id,
        //     actorType: actor.type,
        //     actorVersion: actor.constructor.version
        // };
        // yield this[es].createSnap(newSnap);
        // return newSnap;
    }
    // create(data, cb) {
    //     let actor = new this[ActorKey](data);
    //     co(function* () {
    //         try {
    //             yield this.createSnap(actor);
    //             this[cacheKey][actor.id] = actor;
    //             cb(null, actor.json);
    //         } catch (err) {
    //             cb(err);
    //         }
    //     }.bind(this));
    // }
    clear(id) {
        // this[cacheKey][id] = null;
    }
    getFromCache(id) {
        // return this[cacheKey][id];
    }
    async get(id) {
        return Promise.resolve(new Actor_1.Actor);
        // co(function* () {
        //     if (Array.isArray(this[cacheKey][id])) {
        //         this[cacheKey][id].push(cb);
        //     } else if (!this[cacheKey][id]) {
        //         this[cacheKey][id] = [];
        //         let snap = yield this[es].getLatestSnapshot(id);
        //         if (snap) {
        //             let events = yield this[es].getEventsBySnapshot(snap.id);
        //             let actor = reborm(this[Actors][snap.actorVersion], snap, events);
        //             if (this[ActorKey].version !== snap.actorVersion) {
        //                 let newSnap = yield this.createSnap(actor);
        //                 actor = reborm(this[ActorKey], newSnap, []);
        //             }
        //             this.domain.call(actor, "upgrade");
        //             cb(null, actor);
        //             this[cacheKey][id].forEach(callback => {
        //                 callback(null, actor);
        //             });
        //             this[cacheKey][id] = actor;
        //         } else {
        //             cb(null, null);
        //         }
        //     } else {
        //         cb(null, this[cacheKey][id]);
        //     }
        // }.bind(this)).catch(function (err) {
        //     console.log(err.stack);
        // });
    }
    exist(id) {
        // return !!this[cacheKey];
    }
}
exports.default = Repository;
//# sourceMappingURL=Repository.js.map