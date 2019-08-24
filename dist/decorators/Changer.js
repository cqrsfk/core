"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function Changer(event) {
    return function (target, propertyKey) {
        let changers = Reflect.getMetadata("changers", target.constructor);
        if (!changers) {
            Reflect.defineMetadata("changers", (changers = {}), target.constructor);
        }
        changers[event] = propertyKey;
    };
}
exports.Changer = Changer;
//# sourceMappingURL=Changer.js.map