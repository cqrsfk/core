module.exports = {
  types:["User"],
  methods:{
      add(money) {
          this.service.apply("add", money);
          return "-------> " + money;
      }
  },
  name:"charger",
  updater:{
      add(data,event){
        return { money: data.money + event.data }
      }
  }
}
