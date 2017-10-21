module.exports = {
  types:["User"],
  methods:{
    deduct(money) {
        this.$("deduct", money);
    }
  },
  name:"payers",
  updater:{
    deduct(data,event){
      return { money: data.money - event.data }
    }
  }
}
