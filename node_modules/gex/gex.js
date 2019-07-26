/* Copyright (c) 2011-2018 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */

;(function() {
  'use strict'
  var root = this
  var previous_gex = root.gex

  var has_require = typeof require !== 'undefined'

  var _ = root._ || (has_require && require('lodash'))
  if (!_)
    throw new Error('gex requires underscore, see http://underscorejs.org')

  function Gex(gexspec) {
    var self = this

    function dodgy(obj) {
      return _.isNull(obj) || _.isNaN(obj) || _.isUndefined(obj)
    }

    function clean(gexexp) {
      var gexstr = '' + gexexp
      if (_.isNull(gexexp) || _.isNaN(gexexp) || _.isUndefined(gexexp)) {
        gexstr = ''
      }
      return gexstr
    }

    function match(str) {
      str = '' + str
      var hasmatch = false
      var gexstrs = _.keys(gexmap)

      for (var i = 0; i < gexstrs.length && !hasmatch; i++) {
        hasmatch = !!gexmap[gexstrs[i]].exec(str)
      }
      return hasmatch
    }

    self.noConflict = function() {
      root.gex = previous_gex
      return self
    }

    self.on = function(obj) {
      if (
        _.isString(obj) ||
        _.isNumber(obj) ||
        _.isBoolean(obj) ||
        _.isDate(obj) ||
        _.isRegExp(obj)
      ) {
        return match(obj) ? obj : null
      } else if (_.isArray(obj) || _.isArguments(obj)) {
        var out = []
        for (var i = 0; i < obj.length; i++) {
          if (!dodgy(obj[i]) && match(obj[i])) {
            out.push(obj[i])
          }
        }
        return out
      } else if (_.isObject(obj)) {
        var outobj = {}
        for (var p in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, p)) {
            if (match(p)) {
              outobj[p] = obj[p]
            }
          }
        }
        return outobj
      } else {
        return null
      }
    }

    self.esc = function(gexexp) {
      var gexstr = clean(gexexp)
      gexstr = gexstr.replace(/\*/g, '**')
      gexstr = gexstr.replace(/\?/g, '*?')
      return gexstr
    }

    self.re = function(gs) {
      if ('' === gs || gs) {
        gs = self.escregexp(gs)

        // use [\s\S] instead of . to match newlines
        gs = gs.replace(/\\\*/g, '[\\s\\S]*')
        gs = gs.replace(/\\\?/g, '[\\s\\S]')

        // escapes ** and *?
        gs = gs.replace(/\[\\s\\S\]\*\[\\s\\S\]\*/g, '\\\*')
        gs = gs.replace(/\[\\s\\S\]\*\[\\s\\S\]/g, '\\\?')

        gs = '^' + gs + '$'

        return new RegExp(gs)
      } else {
        var gexstrs = _.keys(gexmap)
        return 1 == gexstrs.length ? gexmap[gexstrs[0]] : _.clone(gexmap)
      }
    }

    self.escregexp = function(restr) {
      return restr
        ? ('' + restr).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
        : ''
    }

    self.toString = function() {
      return desc ? desc : (desc = 'gex[' + _.keys(gexmap) + ']')
    }

    self.inspect = function() {
      return self.toString()
    }

    var gexstrs = _.isArray(gexspec) ? gexspec : [gexspec]
    var gexmap = {}
    var desc

    _.each(gexstrs, function(str) {
      str = clean(str)
      var re = self.re(str)
      gexmap[str] = re
    })
  }

  function gex(gexspec) {
    var gexobj = new Gex(gexspec)
    return gexobj
  }
  gex.Gex = Gex

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = gex
    }
    exports.gex = gex
  } else {
    root.gex = gex
  }
}.call(this))
