# gex

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]


## Glob expressions for JavaScript

*"When regular expressions are just too hard!"*

Match glob expressions using * and ? against any JavaScript data type. 
The character * means match anything of any length, the character ? means match exactly one of any character, 
and all other characters match themselves.

    var gex = require('gex')

    gex('a*').on( 'abc' ) // returns 'abc'
    gex('a*c').on( 'abbbc' ) // returns 'abbbc'
    gex('a?c').on( 'abc' ) // returns 'abc'

You can also match against objects and arrays:

    gex('a*').on( ['ab','zz','ac'] ) // returns ['ab','ac']
    gex('a*').on( {ab:1,zz:2,ac:3} ) // returns {ab:1,ac:3}

And also match against multiple globs:

    gex(['a*','b*']).on( 'bx' ) // returns 'bx'
    gex(['a*','b*']).on( ['ax','zz','bx'] ) // returns ['ax','bx']


One of the most useful things you can do with this library is quick
assertions in unit tests. For example if your objects contain dates,
randomly generated unique identifiers, or other data irrelevant for
testing, `gex` can help you ignore them when you use `JSON.stringify`:

    var entity = {created: new Date().getTime(), name:'foo' }
    assert.ok( gex('{"created":*,"name":"foo"}').on( JSON.stringify(entity) ) )

If you need to use globbing on files, here's how apply a glob to a list of files in a folder:

    var fs = require('fs')
    fs.readdir('.',function(err,files){ 
      var pngs = gex('*.png').on(files) 
    })

And that's it!


## Installation

    npm install gex

And in your code:

    var gex = require('gex')

Or clone the git repository:
    git clone git://github.com/rjrodger/gex.git


This library depends on the excellent underscore module: [underscore](https://github.com/documentcloud/underscore)


## Usage

The `gex` object is a function that takes a single argument, the glob
expression.  This returns a `Gex` object that has only one function
itself: `on`. The `on` function accepts any JavaScript data type, and operates as follows:

   * strings, numbers, booleans, dates, regexes: converted to string form for matching, returned as themselves
   * arrays: return a new array with all the elements that matched. Elements are not modified, but are converted to strings for matching. Does not recurse into elements.
   * objects: return a new object with with all the property *names* that matched. Values are copied by reference. 
   * null, NAN, undefined: never match anything

## Support

If you're using this library, feel free to contact me on twitter if you have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

This module works on both Node.js and browsers.



[npm-badge]: https://badge.fury.io/js/gex.svg
[npm-url]: https://badge.fury.io/js/gex
[travis-badge]: https://api.travis-ci.org/rjrodger/gex.svg?branch=master
[travis-url]: https://travis-ci.org/rjrodger/gex?branch=master
[coveralls-badge]:https://coveralls.io/repos/rjrodger/gex/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/rjrodger/gex?branch=master
[david-badge]: https://david-dm.org/rjrodger/gex.svg
[david-url]: https://david-dm.org/rjrodger/gex

