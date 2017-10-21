module.exports = {
  types:["User"],
  methods:{
      add(money) {
          this.service.apply("add", money);
      }
  },
  name:"charger",
  updater:{
      add(data,event){
        return { money: data.money + event.data }
      }
  }
}
