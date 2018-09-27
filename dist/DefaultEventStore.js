"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    existSaga(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            return !!(yield this.getSaga(sagaId));
        });
    }
    beginSaga(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const exist = yield this.existSaga(sagaId);
            if (!exist) {
                return this.sagas.insert({ sagaId, done: false, alive: true });
            }
        });
    }
    getSaga(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sagas.cfindOne({ sagaId, alive: true }).exec();
        });
    }
    killSaga(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sagas.update({ sagaId }, { alive: false });
        });
    }
    endSaga(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const exist = yield this.existSaga(sagaId);
            if (exist) {
                return yield this.sagas.update({ sagaId }, { done: true });
            }
        });
    }
    findUndoneSaga() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sagas.find({ done: false });
        });
    }
    createSnap(snap) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.snaps.insert(snap.json);
        });
    }
    saveEvents(events) {
        return __awaiter(this, void 0, void 0, function* () {
            events = [].concat(events);
            const eventsJSONArr = events.map(event => {
                return event.json || event;
            });
            yield this.events.insert(eventsJSONArr);
            this.emit('saved events', events);
        });
    }
    getLatestSnapshot(actorId) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield this.snaps.cfindOne({ actorId }).sort({ index: -1, date: -1 }).exec();
            if (data) {
                return Snap_1.default.parse(data);
            }
        });
    }
    getEvents(actorId) {
        return __awaiter(this, void 0, void 0, function* () {
            let events = yield this.events.cfind({ actorId }).sort({ index: 1, date: 1 }).exec();
            return events.map(event => Event_1.default.parse(event));
        });
    }
    getLatestEvent(actorId) {
        return __awaiter(this, void 0, void 0, function* () {
            let event = yield this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).limit(1).exec();
            return event.length ? Event_1.default.parse(event[0]) : null;
        });
    }
    getEventsBySnapshot(snapId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snap = yield this.getSnapshotById(snapId);
            if (snap) {
                let events = yield this.events.cfind({
                    actorId: snap.actorId,
                    index: { '$gt': snap.latestEventIndex }
                }).sort({ date: 1, index: 1 }).exec();
                return events.map(event => Event_1.default.parse(event));
            }
        });
    }
    getSnapshotByIndex(actorId, index) {
        return __awaiter(this, void 0, void 0, function* () {
            let snap = yield this.snaps.cfindOne({ actorId, index }).exec();
            return Snap_1.default.parse(snap);
        });
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
    getSnapshotById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let snap = yield this.snaps.cfindOne({ id }).exec();
            return Snap_1.default.parse(snap);
        });
    }
    getEventById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let event = yield this.events.cfindOne({ id }).exec();
            if (event) {
                return Event_1.default.parse(event);
            }
            else {
                return null;
            }
        });
    }
    findEventsBySagaId(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let events = yield this.events.cfind({ sagaId }).sort({ index: -1, date: -1 }).exec();
            return events.map(event => Event_1.default.parse(event));
        });
    }
    removeEventsBySagaId(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.killSaga(sagaId);
            yield this.events.remove({ sagaId });
        });
    }
    findFollowEvents(actorId, index) {
        return __awaiter(this, void 0, void 0, function* () {
            let events = yield this.events.cfind({ actorId, index: { $gt: index } }).sort({ index: 1, date: 1 }).exec();
            return events.map(event => Event_1.default.parse(event));
        });
    }
}
exports.default = DefaultEventStore;
//# sourceMappingURL=DefaultEventStore.js.map