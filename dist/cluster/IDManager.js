"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class IDManager {
    constructor(domain, socket) {
        this.domain = domain;
        this.socket = socket;
        this.holdIds = new Set();
        this.domainId = domain.id;
    }
    unbind(id) {
        return __awaiter(this, void 0, void 0, function* () {
            this.holdIds.delete(id);
            this.socket.emit("unbind", { domainId: this.domainId, id });
        });
    }
    isHold(id) {
        return this.holdIds.has(id);
    }
    bind(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isHold(id))
                return;
            var that = this;
            return new Promise(resolve => {
                let timeout = false;
                // timeout
                let t = setTimeout(() => {
                    timeout = true;
                    resolve("timeout");
                }, 1000);
                this.socket.emit("bind", { domainId: this.domainId, id }, (err, result) => {
                    clearTimeout(t);
                    this.holdIds.add(id);
                    if (!timeout) {
                        resolve();
                    }
                });
            });
        });
    }
}
exports.IDManager = IDManager;
//# sourceMappingURL=IDManager.js.map