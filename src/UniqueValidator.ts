import Actor from "./Actor";
export type arr = { key: string, value: string | number }[];
export default class UniqueValidator extends Actor {

  constructor({ actotType, uniqueFields }) {
    uniqueFields = new Set(uniqueFields);
    const repos = {};
    uniqueFields.forEach(field => {
      repos[field] = [];
    });
    super({ id: actotType, uniqueFields: [...uniqueFields], repos })
  }

  static getType(){
    return 'UniqueValidator';
  }

  private getArr(key: string | arr, value?: string): arr {
    let arr: arr;
    if (!Array.isArray(key)) {
      arr = [{ key, value }];
    } else {
      arr = key;
    }
    return arr;
  }

  hasHold(key: string | arr, value?: string):boolean {
    let arr = this.getArr(key, value);
    return arr.every(item => {
      let repo = this.json.repos[item.key];
      if (repo) {
        return repo.includes(item.value);
      } else {
        return false;
      }
    });
  }

  hold(key: string | arr, value?: string) {
    let arr = this.getArr(key, value);
    if(this.hasHold(arr)){
      return false;
    }
    this.$(arr);
    return true;
  }

  get updater() {
    return {
      hold(json, event) {
        let arr: arr = event.data;
        let repos = json.repos;
        arr.forEach(function(item) {
          repos[item.key].push(item.value);
        });
        return { repos }
      }
    }
  }

}
