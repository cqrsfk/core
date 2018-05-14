"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Domain_1 = require("../Domain");
class Domain {
    constructor({ manager }) {
        this.manager = manager;
        this.$domain = new Domain_1.default(); // todo
    }
    create(type, data) {
        // todo
        return this.$domain.create(type, data);
    }
    get(type, id) {
        // todo
        return this.$domain.get(type, id);
    }
}
exports.default = Domain;
//# sourceMappingURL=Domain.js.map