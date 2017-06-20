import Event from "./Event";
interface EventStore {
    on(string: any, Function: any): any;
    once(string: any, Function: any): any;
    createSnap(Snap: any): Promise<any>;
    saveEvents(events: Event[] | Event): Promise<any>;
    getLatestSnapshot(actorId: string): Promise<any>;
    getEvents(actorId: string): Promise<any>;
    getLatestEvent(actorId: string): Promise<any>;
    getEventsBySnapshot(snapId: string): Promise<any>;
    getSnapshotByIndex(actorId: string, index: number): Promise<any>;
    getSnapshotByLastIndex(actorId: string, index: number): Promise<any>;
    getSnapshotById(id: string): Promise<any>;
    getEventById(id: string): Promise<any>;
    findEventsBySagaId(sagaId: string): Promise<any>;
    removeEventsBySagaId(sagaId: string): Promise<any>;
}
export default EventStore;
