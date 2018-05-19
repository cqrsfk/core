/// <reference types="node" />
import Event from "./Event";
import { EventEmitter } from "events";
import EventStore from "./EventStore";
import Snap from "./Snap";
export default class DefaultEventStore extends EventEmitter implements EventStore {
    private events;
    private snaps;
    private sagas;
    constructor();
    existSaga(sagaId: string): Promise<boolean>;
    beginSaga(sagaId: string): Promise<any>;
    getSaga(sagaId: string): Promise<boolean>;
    killSaga(sagaId: string): Promise<any>;
    endSaga(sagaId: any): Promise<any>;
    findUndoneSaga(): Promise<string[]>;
    createSnap(snap: Snap): Promise<any>;
    saveEvents(events: Event[] | Event): Promise<void>;
    getLatestSnapshot(actorId: any): Promise<Snap>;
    getEvents(actorId: any): Promise<any>;
    getLatestEvent(actorId: any): Promise<Event>;
    getEventsBySnapshot(snapId: string): Promise<any>;
    getSnapshotByIndex(actorId: any, index: any): Promise<Snap>;
    getSnapshotById(id: any): Promise<Snap>;
    getEventById(id: any): Promise<Event>;
    findEventsBySagaId(sagaId: any): Promise<Event[]>;
    removeEventsBySagaId(sagaId: string): Promise<void>;
    findFollowEvents(actorId: string, index: number): Promise<any>;
}
