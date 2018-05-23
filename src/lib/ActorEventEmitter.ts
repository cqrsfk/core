import Actor from "./Actor";
import EventType from "./EventType";
import Event from "./Event";

export default class ActorEventEmitter extends Actor {

  constructor(data) {
    super(data)
  }

  static getType(){
    return 'ActorEventEmitter';
  }

  async publish(event: Event) {
    let json = this.json;
    let map = json[event.actorType];
    for (let listenerId in map) {
      let listener = map[listenerId];
      let { listenerType, handleMethodName } = listener;
      listener = await this.service.get(listenerType, listenerId);
      if (listener) {
        await listener[handleMethodName](event);
      }
    }
    this.service.unbind();
  }

  subscribe(actorType: string, listenerType: string, listenerId: string, handleMethodName: string) {
    this.service.apply("_subscribe",{ actorType, listenerType, listenerId, handleMethodName });
    this.service.unbind();
  }

  unsubscribe(actorType: string, listenerId: string) {
    this.service.apply("_unsubscribe",{ actorType, listenerId });
    this.service.unbind();
  }

  get updater() {
    return {
      _subscribe(json, event) {
        let data = event.data;
        let listenerMap = json[data.actorType] || {};
        listenerMap[data.listenerId] = data;
        return { [data.actorType]: listenerMap }
      },
      _unsubscribe(json, event) {
        let data = event.data;
        let listenerMap = json[data.actorType] || {};
        delete listenerMap[data.listenerId];
        return { [data.actorType]: listenerMap }
      }
    }
  }

}
