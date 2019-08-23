"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function Mutation(props) {
    return function (target, propertyKey) {
        let mutations = Reflect.getMetadata("mutations", target.constructor);
        if (!mutations) {
            Reflect.defineMetadata("mutations", (mutations = {}), target.constructor);
        }
        mutations[propertyKey] = props;
    };
}
exports.Mutation = Mutation;
//# sourceMappingURL=Mutation.js.map