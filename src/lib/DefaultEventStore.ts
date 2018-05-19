import Event from "./Event";
import { EventEmitter } from "events";
import EventStore from "./EventStore";
const nedb = require("nedb-promise");
import Snap from "./Snap";

export default class DefaultEventStore extends EventEmitter implements EventStore {

    private events;
    private snaps;
    private sagas;

    constructor() {
        super();
        this.events = nedb();
        this.snaps = nedb();
        this.sagas = nedb();
    }

    async existSaga(sagaId: string): Promise<boolean> {
        return !!await this.getSaga(sagaId);
    }

    async beginSaga(sagaId: string): Promise<any> {
        const exist = await this.existSaga(sagaId);
        if (!exist) {
            return this.sagas.insert({ sagaId, done: false, alive: true });
        }
    }

    async getSaga(sagaId: string): Promise<boolean> {
        return await this.sagas.cfindOne({ sagaId, alive: true }).exec();
    }

    async killSaga(sagaId: string) {
        return await this.sagas.update({ sagaId }, { alive: false });
    }

    async endSaga(sagaId): Promise<any> {
        const exist = await this.existSaga(sagaId);
        if (exist) {
            return await this.sagas.update({ sagaId }, { done: true });
        }
    }

    async findUndoneSaga(): Promise<string[]> {
        return await this.sagas.find({ done: false });
    }

    async createSnap(snap: Snap) {
        return await this.snaps.insert(snap.json);
    }

    async saveEvents(events: Event[] | Event) {
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
            return Snap.parse(data);
        }
    }

    async getEvents(actorId) {
        let events = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event.parse(event));
    }

    async getLatestEvent(actorId) {
        let event = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).limit(1).exec();
        return event.length ? Event.parse(event[0]) : null;
    }

    async getEventsBySnapshot(snapId: string): Promise<any> {
        const snap = await this.getSnapshotById(snapId);
        if (snap) {
            let events = await this.events.cfind({
                actorId: snap.actorId,
                index: { '$gt': snap.latestEventIndex }
            }).sort({ date: 1, index: 1 }).exec();
            return events.map(event => Event.parse(event));
        }
    }

    async getSnapshotByIndex(actorId, index): Promise<Snap> {
        let snap = await this.snaps.cfindOne({ actorId, index }).exec();
        return Snap.parse(snap);
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
        return Snap.parse(snap);
    }

    async getEventById(id) {
        let event = await this.events.cfindOne({ id }).exec();
        if (event) {
            return Event.parse(event);
        } else {
            return null;
        }
    }

    async findEventsBySagaId(sagaId): Promise<Event[]> {
        let events = await this.events.cfind({ sagaId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event.parse(event));
    }

    async removeEventsBySagaId(sagaId: string) {
        await this.killSaga(sagaId);
        await this.events.remove({ sagaId });
    }

    async findFollowEvents(actorId: string, index:number): Promise<any>{
      let events = await this.events.cfind({ actorId, index:{$gt:index} }).sort({ index: -1, date: -1 }).exec();
      return events.map(event => Event.parse(event));
    }


}
