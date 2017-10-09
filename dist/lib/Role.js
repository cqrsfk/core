"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Role {
    constructor(name, supportedActorNames, methods) {
        this.name = name;
        this.supportedActorNames = supportedActorNames;
        this.methods = methods;
    }
    // [actor , {roleA, roleB} ]
    wrap(actor) {
        if (Array.isArray(actor)) {
            const act = actor[0];
            if (!this.supportedActorNames.includes(act.actorType))
                throw new Error(this.name + "role don't support " + act.actorType + " actor.");
            const roles = actor[1];
            roles[this.name] = this;
            return actor;
        }
        else {
            return [actor, { [this.name]: this }];
        }
    }
}
exports.default = Role;
//# sourceMappingURL=Role.js.map