"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
const Action_1 = require("./decorators/Action");
const Changer_1 = require("./decorators/Changer");
class Saga extends Actor_1.Actor {
    constructor() {
        super();
        this.finish = false;
        this.actorInfos = [];
    }
    async recover() {
        if (this.finish)
            return;
        let events = [];
        for (let info of this.actorInfos) {
            const { rev, id, type } = info;
            const act = await this.$cxt.get(type, id);
            const history = await act.history();
            events = [...events, ...history.getUndoneEvents(this._id)];
        }
        await this.recoverHandle(events);
        await this.end();
    }
    async begin(acts) {
        if (this.finish)
            return;
        this.$cxt.apply("begin", acts);
        await this.save();
    }
    setActorInfos(event) {
        for (let act of event.data) {
            const type = act.$type;
            this.actorInfos.push({
                type,
                id: act._id,
                rev: act._rev
            });
        }
    }
    async end() {
        if (this.finish)
            return;
        this.$cxt.apply("finish", []);
        await this.save();
    }
    setFinish() {
        this.finish = true;
    }
}
__decorate([
    Action_1.Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Saga.prototype, "recover", null);
__decorate([
    Action_1.Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], Saga.prototype, "begin", null);
__decorate([
    Changer_1.Changer("begin"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Saga.prototype, "setActorInfos", null);
__decorate([
    Action_1.Action(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Saga.prototype, "end", null);
__decorate([
    Changer_1.Changer("finish"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Saga.prototype, "setFinish", null);
exports.Saga = Saga;
//# sourceMappingURL=Saga.js.map