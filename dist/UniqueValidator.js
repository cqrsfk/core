"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
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
    hasHold(key, value) {
        let arr = this.getArr(key, value);
        return arr.every(item => {
            let repo = this.json.repos[item.key];
            if (repo) {
                return repo.includes(item.value);
            }
            else {
                return false;
            }
        });
    }
    hold(key, value) {
        let arr = this.getArr(key, value);
        if (this.hasHold(arr)) {
            return false;
        }
        this.$(arr);
        return true;
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