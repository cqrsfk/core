"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const assert_1 = require("assert");
const DefaultEventStore_1 = require("../lib/DefaultEventStore");
const Event_1 = require("../lib/Event");
const Actor_1 = require("../lib/Actor");
const es = new DefaultEventStore_1.default();
describe("DefaultEventStore", function () {
    it("#saga", async function () {
        const sid = "001", sid2 = "002";
        assert_1.ok(await es.existSaga(sid) === false);
        await es.beginSaga(sid);
        assert_1.ok(await es.existSaga(sid));
        let sagaids = await es.findUndoneSaga();
        assert_1.ok(sagaids.length === 1);
        await es.beginSaga(sid2);
        sagaids = await es.findUndoneSaga();
        assert_1.ok(sagaids.length === 2);
        await es.endSaga(sid);
        await es.endSaga(sid2);
        sagaids = await es.findUndoneSaga();
        assert_1.ok(sagaids.length === 0);
        await es.beginSaga(sid);
        assert_1.ok(await es.existSaga(sid));
        await es.killSaga(sid);
        assert_1.ok(await es.existSaga(sid) === false);
        await es.beginSaga(sid);
        let actor = new Actor_1.default();
        let event = new Event_1.default(actor, { name: "leo" }, "change", "change", sid);
        await es.saveEvents(event);
        assert_1.ok(!!await es.getEventById(event.id));
        await es.removeEventsBySagaId(sid);
        assert_1.ok(!await es.getEventById(event.id));
    });
    it("#unique validator", async function () {
        class User extends Actor_1.default {
            constructor(data) {
                super(data);
            }
            beforeCreate(data, uniqueOk) {
                if (!uniqueOk) {
                    // 非唯一验证未通过处理
                }
            }
        }
        // 唯一性字段指定
        User.uniqueFields = ['code', 'loginname'];
    });
});
//# sourceMappingURL=test.DefaultEventStore.js.map