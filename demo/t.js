var patrun = require('patrun')

var many = patrun( function(pat,data){
    var items = this.find(pat,false) || []
    items.push(data)
  
    return {
      find: function(args,data){
          console.log(data)
        return 0 < items.length ? items : null
      },
      remove: function(args,data){
        items.pop()
        return 0 == items.length;
      }
    }
  })

  many.add( {Type:"User"}, 'C' )
  many.add( {Type:"User",id:"001"}, 'B' )
  many.add( {Type:"User",id:"001",method:"change"}, 'A' )
  
  console.log(many.find( {Type:"User"} ,true) )// [ 'A', 'B' ]
  console.log(many.find( {id:"001"} ,false) )// [ 'A', 'B' ]
  