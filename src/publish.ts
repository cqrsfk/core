import { getAlias } from "./eventAlias";
export function publish(events, bus) {
  setImmediate(function() {
    events.forEach(event => {
      const eventNames = getAlias(event);
      eventNames.forEach(e => {
        bus.emit(e, event);
      });
    });
  });
}
