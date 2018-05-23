"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
class ActorEventEmitter extends Actor_1.default {
    constructor(data) {
        super(data);
    }
    static getType() {
        return 'ActorEventEmitter';
    }
    async publish(event) {
        let json = this.json;
        let map = json[event.actorType];
        for (let listenerId in map) {
            let listener = map[listenerId];
            let { listenerType, handleMethodName } = listener;
            listener = await this.service.get(listenerType, listenerId);
            if (listener) {
                await listener[handleMethodName](event);
            }
        }
        this.service.unbind();
    }
    subscribe(actorType, listenerType, listenerId, handleMethodName) {
        this.service.apply("_subscribe", { actorType, listenerType, listenerId, handleMethodName });
        this.service.unbind();
    }
    unsubscribe(actorType, listenerId) {
        this.service.apply("_unsubscribe", { actorType, listenerId });
        this.service.unbind();
    }
    get updater() {
        return {
            _subscribe(json, event) {
                let data = event.data;
                let listenerMap = json[data.actorType] || {};
                listenerMap[data.listenerId] = data;
                return { [data.actorType]: listenerMap };
            },
            _unsubscribe(json, event) {
                let data = event.data;
                let listenerMap = json[data.actorType] || {};
                delete listenerMap[data.listenerId];
                return { [data.actorType]: listenerMap };
            }
        };
    }
}
exports.default = ActorEventEmitter;
//# sourceMappingURL=ActorEventEmitter.js.map