"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
exports.datakey = Symbol("datakey");
class UniqueValidator extends Actor_1.default {
    constructor({ actotType, uniqueFields }) {
        uniqueFields = new Set(uniqueFields);
        const repos = {};
        uniqueFields.forEach(field => {
            repos[field] = [];
        });
        super({ id: actotType, uniqueFields: [...uniqueFields], repos });
    }
    static getType() {
        return 'UniqueValidator';
    }
    getArr(key, value) {
        let arr;
        if (!Array.isArray(key)) {
            arr = [{ key, value }];
        }
        else {
            arr = key;
        }
        return arr;
    }
    hasVoid(key, value) {
        let arr = this.getArr(key, value);
        return arr.every(item => {
            let repo = this[exports.datakey].repos[item.key];
            if (repo) {
                repo.includes(item.value);
                this.service.unbind();
            }
            else {
                this.service.unbind();
                return true;
            }
        });
    }
    filter(arr) {
        return arr.map(item => this[exports.datakey].uniqueFields.includes(item.key));
    }
    hold(key, value) {
        let arr = this.filter(this.getArr(key, value));
        this.$(arr);
        this.service.unbind();
        return false;
    }
    get updater() {
        return {
            hold(json, event) {
                let arr = event.data;
                let repos = json.repos;
                arr.forEach(function (item) {
                    repos[item.key].push(item.value);
                });
                return { repos };
            }
        };
    }
}
exports.default = UniqueValidator;
//# sourceMappingURL=UniqueValidator.js.map