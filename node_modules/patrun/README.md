# patrun

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[![Gitter chat][gitter-badge]][gitter-url]

### A fast pattern matcher on JavaScript object properties.

Need to pick out an object based on a subset of its properties? Say you've got:

```JavaScript
{ x:1,     } -> A
{ x:1, y:1 } -> B
{ x:1, y:2 } -> C
```

Then patrun can give you the following results:

```JavaScript
{ x:1 }      -> A
{ x:2 }      -> no match
{ x:1, y:1 } -> B
{ x:1, y:2 } -> C
{ x:2, y:2 } -> no match
{ y:1 }      -> no match
```

It's basically _query-by-example_ for property sets.

This module is used by the [Seneca](http://senecajs.org) framework to pattern match actions.



### Support

If you're using this library, feel free to contact me on twitter if you have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

This module works on both Node.js and browsers.


### Quick example

Here's how you register some patterns, and then search for matches:

```JavaScript
var patrun = require('patrun')

var pm = patrun()
      .add({a:1},'A')
      .add({b:2},'B')

// prints A
console.log( pm.find({a:1}) )

// prints null
console.log( pm.find({a:2}) )

// prints A, b:1 is ignored, it was never registered
console.log( pm.find({a:1,b:1}) )

// prints B, c:3 is ignored, it was never registered
console.log( pm.find({b:2,c:3}) )
```

You're matching a subset, so your input can contain any number of other properties.


## Install

For Node.js:

```sh
npm install patrun
```

For Bower:

```sh
bower install patrun
```


# The Why

This module lets you build a simple decision tree so you can avoid
writing _if_ statements. It tries to make the minimum number of
comparisons necessary to pick out the most specific match.

This is very useful for handling situations where you have lots of
"cases", some of which have "sub-cases", and even "sub-sub-sub-cases".

For example, here are some sales tax rules:

   * default: no sales tax
   * here's a list of countries with known rates: Ireland: 23%, UK: 20%, Germany: 19%, ...
   * but wait, that's only standard rates, here's [the other rates](http://www.vatlive.com/vat-rates/european-vat-rates/eu-vat-rates/)
   * Oh, and we also have the USA, where we need to worry about each state...

Do this:

```JavaScript

// queries return a function, in case there is some
// really custom logic (and there is, see US, NY below)
// in the normal case, just pass the rate back out with
// an identity function
// also record the rate for custom printing later
function I(val) { var rate = function(){return val}; rate.val=val; return rate }


var salestax = patrun()
salestax
  .add({}, I(0.0) )

  .add({ country:'IE' }, I(0.25) )
  .add({ country:'UK' }, I(0.20) )
  .add({ country:'DE' }, I(0.19) )

  .add({ country:'IE', type:'reduced' }, I(0.135) )
  .add({ country:'IE', type:'food' },    I(0.048) )

  .add({ country:'UK', type:'food' },    I(0.0) )

  .add({ country:'DE', type:'reduced' }, I(0.07) )

  .add({ country:'US' }, I(0.0) ) // no federeal rate (yet!)

  .add({ country:'US', state:'AL' }, I(0.04) )
  .add({ country:'US', state:'AL', city:'Montgomery' }, I(0.10) )

  .add({ country:'US', state:'NY' }, I(0.07) )
  .add({ country:'US', state:'NY', type:'reduced' }, function under110(net){
    return net < 110 ? 0.0 : salestax.find( {country:'US', state:'NY'} )
  })


console.log('Default rate: ' +
            salestax.find({})(99) )

console.log('Standard rate in Ireland on E99: ' +
            salestax.find({country:'IE'})(99) )

console.log('Food rate in Ireland on E99:     ' +
            salestax.find({country:'IE',type:'food'})(99) )

console.log('Reduced rate in Germany on E99:  ' +
            salestax.find({country:'IE',type:'reduced'})(99) )

console.log('Standard rate in Alabama on $99: ' +
            salestax.find({country:'US',state:'AL'})(99) )

console.log('Standard rate in Montgomery, Alabama on $99: ' +
            salestax.find({country:'US',state:'AL',city:'Montgomery'})(99) )

console.log('Reduced rate in New York for clothes on $99: ' +
            salestax.find({country:'US',state:'NY',type:'reduced'})(99) )


// prints:
// Default rate: 0
// Standard rate in Ireland on E99: 0.25
// Food rate in Ireland on E99:     0.048
// Reduced rate in Germany on E99:  0.135
// Standard rate in Alabama on $99: 0.04
// Standard rate in Montgomery, Alabama on $99: 0.1
// Reduced rate in New York for clothes on $99: 0
```

You can take a look a the decision tree at any time:

```JavaScript

// print out patterns, using a custom format function
console.log(salestax.toString( function(f){return f.name+':'+f.val} ))


// prints:
 -> :0
city=Montgomery, country=US, state=AL -> :0.1
country=IE -> :0.25
country=IE, type=reduced -> :0.135
country=IE, type=food -> :0.048
country=UK -> :0.2
country=UK, type=food -> :0
country=DE -> :0.19
country=DE, type=reduced -> :0.07
country=US -> :0
country=US, state=AL -> :0.04
country=US, state=NY -> :0.07
country=US, state=NY, type=reduced -> under110:undefined
```


# The Rules

   * 1: More specific matches beat less specific matches. That is, more property values beat fewer.
   * 2: Property names are checked in alphabetical order.

And that's it.

OK, some examples might help! Let's say you have patterns:

   * `a:0` -> `'A'`
   * `b:1` -> `'B'`
   * `c:2` -> `'C'`
   * `a:0,b:1` -> `'AB'`

Then you'll get the following results
  
   * `a:0` -> `'A'` as exact match
   * `b:1` -> `'B'` as exact match
   * `c:2` -> `'C'` as exact match
   * `a:0,b:1` -> `'AB'` as more specific than `a:0`
   * `a:0,c:2` -> `'A'` as `a` comes before `c`
   * `b:1,c:2` -> `'B'` as `b` comes before `c`


# Glob matching

You can also have glob matching using
[gex](https://github.com/rjrodger/gex). Create a new patrun instance
with:

`js
var glob_patterns = patrun({gex:true})
`

This extends the rules with glob matching:

   * `a:0` -> `'A'`
   * `a:*` -> `'AA'`
   * `b:1,c:x*y` -> `'BC'`

So that you can do this:

   * `a:0` -> `'A'` as exact match
   * `a:1` -> `'AA'` as glob match `a:*`
   * `b:1,c:xhy` -> `'BC'` as exact `b:1` and glob `c:x*y`

As always, more specific matches win, and matches are disambiguated
using alphanumeric sorting, so it doesn't matter what order you add
them. Exact matches are considered more specific than globs. See the
tests for an [example
(multi-gex)](https://github.com/rjrodger/patrun/blob/master/test/patrun.spec.js#L741).


# Customization

You can customize the way that data is stored. For example, you might want to add a constant property to each pattern.

To do this, you provide a custom function when you create the _patrun_ object:

```JavaScript
var alwaysAddFoo = patrun( function(pat){
  pat.foo = true
})

alwaysAddFoo.add( {a:1}, "bar" )

alwaysAddFoo.find( {a:1} ) // nothing!
alwaysAddFoo.find( {a:1,foo:true} ) // == "bar"
```

Your custom function can also return a modifer function for found
data, and optionally a modifier for removing data.

Here's an example that modifies found data:

```JavaScript
var upperify = patrun( function(pat){
  return function(args,data) {
    return (''+data).toUpperCase()
  }
})

upperify.add( {a:1}, "bar" )

upperify.find( {a:1} ) // BAR
```

Finally, here's an example that allows you to add multiple matches for a given pattern:

```JavaScript
var many = patrun( function(pat,data){
  var items = this.find(pat,true) || []
  items.push(data)

  return {
    find: function(args,data){
      return 0 < items.length ? items : null
    },
    remove: function(args,data){
      items.pop()
      return 0 == items.length;
    }
  }
})

many.add( {a:1}, 'A' )
many.add( {a:1}, 'B' )
many.add( {b:1}, 'C' )

many.find( {a:1} ) // [ 'A', 'B' ]
many.find( {b:1} ) // [ 'C' ]

many.remove( {a:1} )
many.find( {a:1} ) // [ 'A' ]

many.remove( {b:1} )
many.find( {b:1} ) // null
```

Check out the [_custom-gex_ test case](https://github.com/rjrodger/patrun/blob/master/test/patrun.spec.js#L324) for some really funky pattern matching using * globs.


# API

## patrun( custom )

Generates a new pattern matcher instance. Optionally provide a customisation function.


## .add( {...pattern...}, object )

Register a pattern, and the object that will be returned if an input
matches.  Both keys and values are considered to be strings. Other
types are converted to strings.

## .find( {...subject...}, exact )

Return the unique match for this subject, or null if not found. The
properties of the subject are matched against the patterns previously
added, and the most specifc pattern wins. Unknown properties in the
subject are ignored. You can optionally provide a second boolean
parameter, _exact_. If true, then all properties of the subject must
match.


## .list( {...pattern-partial...}, exact )

Return the list of registered patterns that contain this partial
pattern. You can use wildcards for property values.  Omitted values
are *not* equivalent to a wildcard of _"*"_, you must specify each
property explicitly. You can optionally provide a second boolean
parameter, _exact_. If true, then only those patterns matching the
pattern-partial exactly are returned.

```JavaScript
pm = patrun()
  .add({a:1,b:1},'B1')
  .add({a:1,b:2},'B2')

// finds: 
// [ { match: { a: '1', b: '1' }, data: 'B1' },
//   { match: { a: '1', b: '2' }, data: 'B2' } ]
console.log( pm.list({a:1}) )

// finds:
// [ { match: { a: '1', b: '1' }, data: 'B1' },
//   { match: { a: '1', b: '2' }, data: 'B2' } ]
console.log( pm.list({a:1,b:'*'}) )

// finds nothing: []
console.log( pm.list({a:1, c:1}) )
```

If you provide no pattern argument at all, _list_ will list all patterns that have been added.
```JavaScript
// finds everything
console.log( pm.list() )
```

## .remove( {...pattern...} )

Remove this pattern, and it's object, from the matcher.


## .toString( func, tree )

Generate a string representation of the decision tree for debugging. Optionally provide a formatting function for objects.

   * func: format function for data, optional
   * tree: boolean flag, if true, print an indented tree rather than a list of patterns, default: false

## .toJSON( indent )

Generate JSON representation of the tree.


# Development

From the Irish patr&uacute;n: [pattern](http://www.focloir.ie/en/dictionary/ei/pattern). Pronounced _pah-troon_.

sudo npm install phantomjs@1.9.1-0 uglify-js -g


[npm-badge]: https://badge.fury.io/js/patrun.svg
[npm-url]: https://badge.fury.io/js/patrun
[travis-badge]: https://api.travis-ci.org/rjrodger/patrun.svg
[travis-url]: https://travis-ci.org/rjrodger/patrun
[coveralls-badge]:https://coveralls.io/repos/rjrodger/patrun/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/rjrodger/patrun?branch=master
[david-badge]: https://david-dm.org/rjrodger/patrun.svg
[david-url]: https://david-dm.org/rjrodger/patrun
[gitter-badge]: https://badges.gitter.im/rjrodger/patrun.svg
[gitter-url]: https://gitter.im/rjrodger/seneca
