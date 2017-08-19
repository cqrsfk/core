import Event from "./Event";
import EventType from "./EventType";

export function getAlias(event: Event | EventType):any {
    if (event instanceof Event) {
        return [
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.${event.sagaId}`,
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.`,
            `${event.actorType}.${event.actorId}.${event.type}..`,
            `${event.actorType}.${event.actorId}...`,
            `${event.actorType}..${event.type}..`,
            `..${event.type}..`,
            `${event.actorType}....`,
            "...."

        ]
    } else {
        return `${event.actorType || ""}.${event.actorId || ""}.${event.type || ""}.${event.method || ""}.${event.sagaId || ""}`;
    }
}
