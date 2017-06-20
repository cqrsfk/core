import Event from "./Event";
import { EventEmitter } from "events";
import EventStore from "./EventStore";
const nedb = require("nedb-promise");
import Snap from "./Snap";

export default class DefaultEventStore extends EventEmitter implements EventStore {

    private events;
    private snaps;

    constructor() {
        super();
        this.events = nedb();
        this.snaps = nedb();
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
            if (snap) {
                let events = await this.events.cfind({
                    actorId: snap.actorId,
                    index: { '$gt': snap.latestEventIndex }
                }).sort({ date: 1, index: 1 }).exec();
                return events.map(event => Event.parse(event));
            }
        }
    }

    async getSnapshotByIndex(actorId, index): Promise<Snap> {
        let snap = await this.snaps.cfindOne({ actorId, index }).exec();
        return Snap.parse(snap);
    }

    async getSnapshotByLastIndex(actorId, index) {
        let snap = await this.getLatestSnapshot(actorId);
        if (snap) {
            if (index === 0) {
                return snap;
            } else {
                return await this.getSnapshotByIndex(actorId, snap.index - index);
            }
        }
    }

    async getSnapshotById(id): Promise<any> {
        let snap = await this.snaps.cfindOne({ id }).exec();
        return Snap.parse(snap);
    }

    async getEventById(id): Promise<any> {
        let event = await this.events.cfindOne({ id }).exec();
        return Event.parse(event);
    }

    async findEventsBySagaId(sagaId): Promise<any> {
        let events = await this.events.cfind({ sagaId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event.parse(event));
    }

    // rollback
    async removeEventsBySagaId(sagaId: string) {
        return await this.events.remove({ sagaId });
    }

}
