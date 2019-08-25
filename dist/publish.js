"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventAlias_1 = require("./eventAlias");
function publish(events, bus) {
    setImmediate(function () {
        events.forEach(event => {
            const eventNames = eventAlias_1.getAlias(event);
            eventNames.forEach(e => {
                bus.emit(e, event);
            });
        });
    });
}
exports.publish = publish;
//# sourceMappingURL=publish.js.map