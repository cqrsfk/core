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
        return arr.some(item => {
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
        let holded = [];
        let hasError = false;
        for (let item of arr) {
            if (this.hasHold(item.key, item.value)) {
                hasError = true;
                holded.push(item.key);
            }
        }
        if (hasError)
            throw { holded };
        this.$(arr);
        return true;
    }
    giveup(key, value) {
        const json = this.json;
        if (json.uniqueFields.includes(key)) {
            if (json.repos[key].includes(value)) {
                this.$({ key, value });
            }
        }
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
            },
            giveup(json, event) {
                let { key, value } = event.data;
                let repos = json.repos;
                let repo = repos[key];
                let repoSet = (new Set(repo));
                repoSet.delete(value);
                repos = Object.assign({}, repos, { [key]: [...repoSet] });
                return { repos };
            }
        };
    }
}
exports.default = UniqueValidator;
//# sourceMappingURL=UniqueValidator.js.map