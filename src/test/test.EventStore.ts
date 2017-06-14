import Event from "../lib/Event";
import { Actor } from "../lib/Actor";
import Snap from "../lib/Snap";
import EventStore from "../lib/DefaultEventStore";
import "mocha";
import should from "should";
const assert = require("assert");

describe("EventStore", function () {

    let es: EventStore;
    it("#new", function () {
        es = new EventStore();
    });

    let actor: Actor;
    let snap: Snap;
    it("#createSnap", async function () {
        actor = new Actor({ name: "leo" });
        snap = new Snap(actor);
        let result = await es.createSnap(snap);

    });
    let event:Event;
    it("#saveEvents", async function (done) {
        // let actor = new Actor({ name: "leo" });
        event = new Event(actor, 1, { name: "zeng" }, "changename", "changename","sss");
        let event2 = new Event(actor, 2, { name: "zeng2" }, "changename2", "changename");
        es.once("saved events", function () { done() });
        let result = await es.saveEvents([event, event2]);
    });

    it("#getLatestSnapshot", async function () {
        let snap = await es.getLatestSnapshot(actor.id);
        assert.ok(snap.actorId === actor.id);
    });

    it("#getEvents", async function () {
        let events = await es.getEvents(actor.id);
        assert.ok(events.length === 2);
        assert.ok(events[0] instanceof Event)
    })

    it("#getLatestEvent", async function () {
        let event: Event = await es.getLatestEvent(actor.id);
        assert.ok(event instanceof Event);
        assert.ok(event.data.name === "zeng2");
    })

    it("#getSnapshotById", async function () {
        const n = await es.getSnapshotById(snap.id);
        assert(n.id === snap.id);
    })

    it("#getEventsBySnapshot", async function () {
        const events: Event[] = await es.getEventsBySnapshot(snap.id);
        assert(events.length === 2);
    })

    it("#getSnapshotByIndex", async function () {
        let snap = new Snap(actor, 2);
        await es.createSnap(snap);
        const n = await es.getSnapshotByIndex(actor.id, 2);
        assert(n.id === snap.id);
    })

    it("#getEventById", async function () {
        let e = await es.getEventById(event.id);
        assert.ok(e.id === event.id)
    })

    it("#findEventsBySagaId", async function(){
        let events = await es.findEventsBySagaId("sss");
        assert(events.length === 1);
        assert(events[0].sagaId === "sss")

    });
});