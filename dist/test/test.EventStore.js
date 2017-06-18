"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("../lib/Event");
const Actor_1 = require("../lib/Actor");
const Snap_1 = require("../lib/Snap");
const DefaultEventStore_1 = require("../lib/DefaultEventStore");
require("mocha");
const assert = require("assert");
describe("EventStore", function () {
    let es;
    it("#new", function () {
        es = new DefaultEventStore_1.default();
    });
    let actor;
    let snap;
    it("#createSnap", async function () {
        actor = new Actor_1.Actor({ name: "leo" });
        snap = new Snap_1.default(actor);
        let result = await es.createSnap(snap);
    });
    let event;
    it("#saveEvents", async function (done) {
        // let actor = new Actor({ name: "leo" });
        event = new Event_1.default(actor, { name: "zeng" }, "changename", "changename", "sss");
        event.index = 1;
        let event2 = new Event_1.default(actor, { name: "zeng2" }, "changename2", "changename");
        event2.index = 2;
        es.once("saved events", function () { done(); });
        let result = await es.saveEvents([event, event2]);
    });
    it("#getLatestSnapshot", async function () {
        let snap = await es.getLatestSnapshot(actor.id);
        assert.ok(snap.actorId === actor.id);
    });
    it("#getEvents", async function () {
        let events = await es.getEvents(actor.id);
        assert.ok(events.length === 2);
        assert.ok(events[0] instanceof Event_1.default);
    });
    it("#getLatestEvent", async function () {
        let event = await es.getLatestEvent(actor.id);
        assert.ok(event instanceof Event_1.default);
        assert.ok(event.data.name === "zeng2");
    });
    it("#getSnapshotById", async function () {
        const n = await es.getSnapshotById(snap.id);
        assert(n.id === snap.id);
    });
    it("#getEventsBySnapshot", async function () {
        const events = await es.getEventsBySnapshot(snap.id);
        assert(events.length === 2);
    });
    it("#getSnapshotByIndex", async function () {
        let snap = new Snap_1.default(actor, 2);
        await es.createSnap(snap);
        const n = await es.getSnapshotByIndex(actor.id, 2);
        assert(n.id === snap.id);
    });
    it("#getEventById", async function () {
        let e = await es.getEventById(event.id);
        assert.ok(e.id === event.id);
    });
    it("#findEventsBySagaId", async function () {
        let events = await es.findEventsBySagaId("sss");
        assert(events.length === 1);
        assert(events[0].sagaId === "sss");
    });
});
//# sourceMappingURL=test.EventStore.js.map