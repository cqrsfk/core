'use strict';
const DB = require('nedb');
const EventEmitter = require("events").EventEmitter;
function fun() {
}

class EventStore extends EventEmitter {

    constructor() {
        super();
        this.events = new DB();
        this.snaps = new DB();
    }

    createSnap(data, cb) {
        this.snaps.insert(data, function (err) {
            cb(err);
        });
    }

    saveEvents(data, cb) {

        if (!Array.isArray(data)) {
            data = [data];
        }

        this.events.insert(data, err => {
            cb(err);
            if (!err) {
                this.emit('saved events', data);
            }
        });
    }

    getLatestSnapshot(actorId, cb) {
        this.snaps.findOne({ actorId }).sort({ index: -1, date: -1 }).exec(cb || fun);
    }

    getEvents(actorId, cb) {
        this.events.find({ actorId }).sort({ index: -1, date: -1 }).exec(cb || fun)
    }

    getLatestEvent(actorId, cb) {
        this.events.findOne({ actorId }).sort({ index: -1, date: -1 }).exec(cb || fun);
    }

    getEventsBySnapshot(snapId, cb) {
        this.getSnapshotById(snapId, (err, snap) => {
            if (snap) {
                this.events.find({
                    actorId: snap.actorId,
                    index: { '$gt': snap.latestEventIndex }
                }).sort({ date: 1, index: 1 }).exec(cb || fun);
            } else {
                cb ? cb(null, []) : null;
            }
        });
    }

    getSnapshotByIndex(actorId, index, cb) {
        this.snaps.findOne({ actorId, index }, cb);
    }

    getSnapshotByLastIndex(actorId, index, cb) {
        this.getLatestSnapshot(actorId, (err, snap) => {
            if (snap) {
                if (index === 0) {
                    cb(null, snap);
                } else {
                    this.getSnapshotByIndex(actorId, snap.index - index, cb);
                }
            } else if (err) {
                cb(err);
            } else {
                cb(null, null);
            }

        });
    }

    getSnapshotById(id, cb) {
        this.snaps.findOne({ id }, cb);
    }

    getEventById(id, cb) {
        this.events.findOne({ id }, cb);
    }

    findEventsBySagaId(sagaId, cb) {
        this.events.find({ sagaId },{}).sort({ index: -1, date: -1 }).exec(cb || fun)
    }

}


module.exports = EventStore;