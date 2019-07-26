import { Event } from "./types/Event";

export function getAlias(event: Event): string[] {
  return [
    `${event.actorType}.${event.actorId}.${event.type}`,
    `${event.actorType}..${event.type}`,
    `${event.actorType}.${event.actorId}.`,
    `${event.actorType}..`
  ];
}
