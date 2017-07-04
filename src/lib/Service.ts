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
    private timeout: number;
    private lockMode = false
    private sagaMode = false
    private key: string = uuid()
    public applied: boolean = false;

    constructor(
        private actor: Actor,
        private bus: EventBus,
        private getActor,
        private createActor,
        private method: string,
        public sagaId?: string) {
    }

    apply(type: string, data?: any, direct?: boolean) {
        if (this.actor.json.isAlive) {
            const event = new Event(this.actor, data, type, this.method, this.sagaId, direct || false);
            this.actor[setdata] = Object.assign({}, this.actor.json, direct ? data : {}, this.actor[Symbol.for("when")](event) || {});
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            this.bus.publish(this.actor);
        }

        this.applied = true;

    }

    lock(timeout?: number) {
        this.lockMode = true;
        this.timeout = timeout;
    }

    unlock() {
        this.lockMode = false;
        // todo
    }

    sagaBegin() {
        if (this.sagaId && !this.sagaMode) {
            throw new Error("Cannot include child Saga");
        }
        this.sagaMode = true;
        this.sagaId = uuid();
    }

    sagaEnd() {
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

    private actorLock(actor): Promise<any> {
        const that = this;
        return new Promise((resolve, reject) => {

            tryLock();

            async function tryLock() {
                var isLock = await actor.lock({ key: that.key, timeout: that.timeout });
                if (isLock) resolve();
                else {
                    setTimeout(tryLock, 300);
                }
            }

        });

    }

    async get(type: string, id: string) {

        if (id === this.actor.id) throw new Error("Don't be get self");
        let proxy = await this.getActor(type, id, this.sagaId || null, this.key);
        if (!proxy) return null;

        if (this.lockMode) {
            await this.actorLock(proxy);
        }

        return proxy;

    }

    async create(type: string, data: any) {
        return this.createActor(...arguments, this.sagaId);
    }

    once(event: EventType, handle: string, timeout?: number) {
        this.bus.subscribe(event, { actorType: this.actor.type, actorId: this.actor.id, method: handle }, timeout);
    }

}