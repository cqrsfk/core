import "mocha";
import { ok } from "assert";
import DefaultEventStore from "../lib/DefaultEventStore";
import Event from '../lib/Event';
import  Actor from "../lib/Actor";

const es = new DefaultEventStore();

describe("DefaultEventStore", function () {

    it("#saga", async function () {
        const sid = "001", sid2 = "002"
        ok(await es.existSaga(sid) === false);
        await es.beginSaga(sid);
        ok(await es.existSaga(sid));
        let sagaids = await es.findUndoneSaga();
        ok(sagaids.length === 1)
        await es.beginSaga(sid2);
        sagaids = await es.findUndoneSaga();
        ok(sagaids.length === 2);

        await es.endSaga(sid);
        await es.endSaga(sid2);

        sagaids = await es.findUndoneSaga();
        ok(sagaids.length === 0);

        await es.beginSaga(sid);
        ok(await es.existSaga(sid));
        await es.killSaga(sid);
        ok(await es.existSaga(sid) === false);

        await es.beginSaga(sid);
        let actor = new Actor();
        let event = new Event(actor, { name: "leo" }, "change", "change", sid);
        await es.saveEvents(event);
        ok(!!await es.getEventById(event.id));
        await es.removeEventsBySagaId(sid);
        ok(!await es.getEventById(event.id));


    })

    it("#unique validator",async function () {

      class User extends Actor{
        // 唯一性字段指定
        static uniqueFields = ['code','loginname']
        beforeCreate(data,uniqueOk){
          if(!uniqueOk){
            // 非唯一验证未通过处理
          }
        }
        constructor(data){
          super(data);
        }
      }

    })
})
