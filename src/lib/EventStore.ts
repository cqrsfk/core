import Snap from "./Snap";
import Event from "./Event";

interface EventStore {

    beginSaga(sagaId: string): Promise<any>;
    existSaga(sagaId: string): Promise<boolean>;
    endSaga(sagaId: string): Promise<any>;
    findUndoneSaga(): Promise<string[]>;
    getSaga(sagaId: string): Promise<any>;

    on(string, Function);
    once(string, Function);
    createSnap(Snap): Promise<any>;
    saveEvents(events: Event[] | Event): Promise<any>;
    getLatestSnapshot(actorId: string): Promise<any>;
    getEvents(actorId: string): Promise<any>;
    getLatestEvent(actorId: string): Promise<any>;
    getEventsBySnapshot(snapId: string): Promise<any>;
    getSnapshotByIndex(actorId: string, index: number): Promise<any>;
    // getSnapshotByLastIndex(actorId: string, index: number): Promise<any>;
    getSnapshotById(id: string): Promise<any>;
    getEventById(id: string): Promise<any>;
    findEventsBySagaId(sagaId: string): Promise<Event[]>;

    findFollowEvents(actorId: string, index:number): Promise<any>;

    // remove events
    removeEventsBySagaId(sagaId: string): Promise<any>;
    killSaga(sagaId: string): Promise<any>
}

export default EventStore;
