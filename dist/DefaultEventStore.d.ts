/// <reference types="node" />
import Event from "./Event";
import { EventEmitter } from "events";
import EventStore from "./EventStore";
import Snap from "./Snap";
export default class DefaultEventStore extends EventEmitter implements EventStore {
    private events;
    private snaps;
    constructor();
    createSnap(snap: Snap): Promise<any>;
    saveEvents(events: Event[] | Event): Promise<void>;
    getLatestSnapshot(actorId: any): Promise<Snap>;
    getEvents(actorId: any): Promise<any>;
    getLatestEvent(actorId: any): Promise<Event>;
    getEventsBySnapshot(snapId: string): Promise<any>;
    getSnapshotByIndex(actorId: any, index: any): Promise<Snap>;
    getSnapshotByLastIndex(actorId: any, index: any): Promise<Snap>;
    getSnapshotById(id: any): Promise<any>;
    getEventById(id: any): Promise<any>;
    findEventsBySagaId(sagaId: any): Promise<any>;
    removeEventsBySagaId(sagaId: string): Promise<any>;
}
