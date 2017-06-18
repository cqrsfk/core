import { Actor } from "./Actor";
import EventBus from "./EventBus";
import EventType from "./EventType";
import Event from "./Event";
const uuid = require("uuid").v1;
const uncommittedEvents = Symbol.for("uncommittedEvents");
const setdata = Symbol.for("setdata")

/**
 * When call actor's method , then DI service object.
 */
export default class Service {

    private lockMode = false
    private sagaMode = false
    private key: string = uuid()


    constructor(
        private actor: Actor, // proxy
        private bus: EventBus,
        private getActor,
        private createActor,
        private method: string,
        private sagaId?: string) {
    }

    async apply(type: string, data?: any) {
        if (this.actor.json.isAlive) {
            const event = new Event(this.actor, data, type, this.method, this.sagaId);
            this.actor[setdata] = this.actor[Symbol.for("when")](event) || this.actor.json;
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            await this.bus.publish(this.actor);
        }
    }

    lock() {
        this.lockMode = true;
    }

    unlock() {
        this.lockMode = false;
    }

    async sagaBegin() {
        if (this.sagaId && !this.sagaMode) {
            throw new Error("Cannot include child Saga");
        }
        this.sagaMode = true;
        this.sagaId = uuid();
    }

    async sagaEnd() {
        if (this.sagaMode) {
            this.sagaMode = false;
            this.sagaId = null;
        }
    }

    async rollback() {
        if (this.sagaMode) {
            return await this.bus.rollback(this.sagaId);
        } else {
            throw new Error("no saga")
        }
    }

    private actorLock(actor, timeout?: number): Promise<any> {
        const that = this;
        return new Promise((resolve, reject) => {

            // try lock actor
            tryLock();

            async function tryLock() {
                try {
                    var isLock = await actor.lock({ key: that.key });

                } catch (e) {
                    console.log(e);
                }
                if (isLock) resolve();
                else {
                    setTimeout(tryLock, timeout || 300);
                }
            }

        });

    }

    async get(type: string, id: string) {

        if (id === this.actor.id) throw new Error("Don't be get self");

        let proxy = await this.getActor(type, id, this.sagaId, this.key);
        if (!proxy) return null;

        if (this.lockMode) {

            await this.actorLock(proxy);

        }

        return proxy;

    }

    async create(type: string, data: any) {
        return this.createActor(...arguments, this.sagaId);
    }

    once(event: EventType, hande: string, timeout?: number) {

    }

    on(event: EventType, handle: string, timeout?: number) {

    }

}