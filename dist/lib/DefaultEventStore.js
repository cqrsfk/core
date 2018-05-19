"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
const events_1 = require("events");
const nedb = require("nedb-promise");
const Snap_1 = require("./Snap");
class DefaultEventStore extends events_1.EventEmitter {
    constructor() {
        super();
        this.events = nedb();
        this.snaps = nedb();
        this.sagas = nedb();
    }
    async existSaga(sagaId) {
        return !!await this.getSaga(sagaId);
    }
    async beginSaga(sagaId) {
        const exist = await this.existSaga(sagaId);
        if (!exist) {
            return this.sagas.insert({ sagaId, done: false, alive: true });
        }
    }
    async getSaga(sagaId) {
        return await this.sagas.cfindOne({ sagaId, alive: true }).exec();
    }
    async killSaga(sagaId) {
        return await this.sagas.update({ sagaId }, { alive: false });
    }
    async endSaga(sagaId) {
        const exist = await this.existSaga(sagaId);
        if (exist) {
            return await this.sagas.update({ sagaId }, { done: true });
        }
    }
    async findUndoneSaga() {
        return await this.sagas.find({ done: false });
    }
    async createSnap(snap) {
        return await this.snaps.insert(snap.json);
    }
    async saveEvents(events) {
        events = [].concat(events);
        const eventsJSONArr = events.map(event => {
            return event.json || event;
        });
        await this.events.insert(eventsJSONArr);
        this.emit('saved events', events);
    }
    async getLatestSnapshot(actorId) {
        let data = await this.snaps.cfindOne({ actorId }).sort({ index: -1, date: -1 }).exec();
        if (data) {
            return Snap_1.default.parse(data);
        }
    }
    async getEvents(actorId) {
        let events = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event_1.default.parse(event));
    }
    async getLatestEvent(actorId) {
        let event = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).limit(1).exec();
        return event.length ? Event_1.default.parse(event[0]) : null;
    }
    async getEventsBySnapshot(snapId) {
        const snap = await this.getSnapshotById(snapId);
        if (snap) {
            let events = await this.events.cfind({
                actorId: snap.actorId,
                index: { '$gt': snap.latestEventIndex }
            }).sort({ date: 1, index: 1 }).exec();
            return events.map(event => Event_1.default.parse(event));
        }
    }
    async getSnapshotByIndex(actorId, index) {
        let snap = await this.snaps.cfindOne({ actorId, index }).exec();
        return Snap_1.default.parse(snap);
    }
    // async getSnapshotByLastIndex(actorId, index) {
    //     let snap = await this.getLatestSnapshot(actorId);
    //     if (snap) {
    //         if (index === 0) {
    //             return snap;
    //         } else {
    //             return await this.getSnapshotByIndex(actorId, snap.index - index);
    //         }
    //     }
    // }
    async getSnapshotById(id) {
        let snap = await this.snaps.cfindOne({ id }).exec();
        return Snap_1.default.parse(snap);
    }
    async getEventById(id) {
        let event = await this.events.cfindOne({ id }).exec();
        if (event) {
            return Event_1.default.parse(event);
        }
        else {
            return null;
        }
    }
    async findEventsBySagaId(sagaId) {
        let events = await this.events.cfind({ sagaId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event_1.default.parse(event));
    }
    async removeEventsBySagaId(sagaId) {
        await this.killSaga(sagaId);
        await this.events.remove({ sagaId });
    }
    async findFollowEvents(actorId, index) {
        let events = await this.events.cfind({ actorId, index: { $gt: index } }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event_1.default.parse(event));
    }
}
exports.default = DefaultEventStore;
//# sourceMappingURL=DefaultEventStore.js.map