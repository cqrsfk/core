import Actor from "./Actor";
export const datakey = Symbol("datakey");
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

  hasVoid(key: string | arr, value?: string) {
    let arr = this.getArr(key, value);
    return arr.every(item => {
      let repo = this[datakey].repos[item.key];
      if (repo) {
        repo.includes(item.value)
        this.service.unbind();
      } else {
        this.service.unbind();
        return true;
      }
    });


  }

  private filter(arr: arr) {
    return arr.map(item => this[datakey].uniqueFields.includes(item.key));
  }

  hold(key: string | arr, value?: string) {
    let arr = this.filter(this.getArr(key, value));
    this.$(arr);
    this.service.unbind();
    return false;
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
