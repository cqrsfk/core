"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Role {
    constructor(name, supportedActorNames, methods, updater = {}) {
        this.name = name;
        this.supportedActorNames = supportedActorNames;
        this.methods = methods;
        this.updater = updater;
    }
    // [actor , {roleA, roleB} ]
    wrap(actor) {
        if (Array.isArray(actor)) {
            const act = actor[0];
            if (!this.supportedActorNames.includes(act.type))
                throw new Error(this.name + "role don't support " + act.type + " actor.");
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