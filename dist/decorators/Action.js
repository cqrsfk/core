"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function Action(props) {
    return function (target, propertyKey) {
        let actions = Reflect.getMetadata("actions", target.constructor);
        if (!actions) {
            Reflect.defineMetadata("actions", (actions = {}), target.constructor);
        }
        actions[propertyKey] = props;
    };
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map