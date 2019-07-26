/* Copyright (c) 2013-2016 Richard Rodger, MIT License, https://github.com/rjrodger/patrun */

;(function() {
  /* jshint node:true, asi:true, eqnull:true */
  'use strict'
  var root = this
  var previous_patrun = root.patrun
  var has_require = typeof require !== 'undefined'

  var _ = root._ || (has_require && require('lodash'))
  if (!_)
    throw new Error('patrun requires underscore, see http://underscorejs.org')

  var gex = root.gex || (has_require && require('gex'))
  if (!gex)
    throw new Error('patrun requires gex, see https://github.com/rjrodger/gex')

  var patrun = (root.patrun = function(custom) {
    custom = custom || {}

    var self = {}
    var top = {}

    self.noConflict = function() {
      root.patrun = previous_patrun
      return self
    }

    self.add = function(pat, data) {
      pat = _.clone(pat)

      var customizer = _.isFunction(custom)
        ? custom.call(self, pat, data)
        : null

      var keys = _.keys(pat), plains = [], gexers = []

      keys.forEach(function(key) {
        var val = pat[key]
        if (null == val) return

        val = String(val)
        pat[key] = val
        ;(custom.gex && val.match(/[\*\?]/) ? gexers : plains).push(key)
      })

      plains = plains.sort()
      gexers = gexers.sort()

      keys = plains.concat(gexers)

      var keymap = top, valmap

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var val = pat[key]

        var gexer = custom.gex && val.match(/[\*\?]/) ? gex(val) : null
        if (gexer) gexer.val$ = val

        var sort_prefix = (gexer ? '1' : '0') + '~'
        var sort_key = sort_prefix + key

        valmap = keymap.v

        if (valmap && sort_key == keymap.sk) {
          add_gexer(keymap, key, gexer)
          keymap = valmap[val] || (valmap[val] = {})
        } else if (!keymap.k) {
          add_gexer(keymap, key, gexer)
          keymap.k = key
          keymap.sk = sort_key
          keymap.v = {}
          keymap = keymap.v[val] = {}
        } else if (sort_key < keymap.sk) {
          var s = keymap.s, g = keymap.g
          keymap.s = { k: keymap.k, sk: keymap.sk, v: keymap.v }
          if (s) keymap.s.s = s
          if (g) keymap.s.g = g

          if (keymap.g) keymap.g = {}
          add_gexer(keymap, key, gexer)

          keymap.k = key
          keymap.sk = sort_key
          keymap.v = {}

          keymap = keymap.v[val] = {}
        } else {
          valmap = keymap.v
          keymap = keymap.s || (keymap.s = {})
          i--
        }
      }

      if (void 0 !== data && keymap) {
        keymap.d = data
        if (customizer) {
          keymap.f = _.isFunction(customizer) ? customizer : customizer.find
          keymap.r = _.isFunction(customizer.remove)
            ? customizer.remove
            : void 0
        }
      }

      return self
    }

    function add_gexer(keymap, key, gexer) {
      if (!gexer) return

      var g = (keymap.g = keymap.g || {})
      var ga = (g[key] = g[key] || [])
      ga.push(gexer)
      ga.sort(function(a, b) {
        return a.val$ < b.val$
      })
    }

    self.findexact = function(pat) {
      return self.find(pat, true)
    }

    self.find = function(pat, exact) {
      if (null == pat) return null

      var keymap = top
      var data = void 0 === top.d ? null : top.d
      var finalfind = top.f
      var key = null
      var stars = []
      var foundkeys = {}
      var patlen = _.keys(pat).length

      do {
        key = keymap.k

        if (keymap.v) {
          var val = pat[key]
          var nextkeymap = keymap.v[val]

          if (!nextkeymap && custom.gex && keymap.g && keymap.g[key]) {
            var ga = keymap.g[key]
            for (var gi = 0; gi < ga.length; gi++) {
              if (null != ga[gi].on(val)) {
                nextkeymap = keymap.v[ga[gi].val$]
                break
              }
            }
          }

          if (nextkeymap) {
            foundkeys[key] = true

            if (keymap.s) {
              stars.push(keymap.s)
            }

            data = void 0 === nextkeymap.d ? null : nextkeymap.d
            finalfind = nextkeymap.f
            keymap = nextkeymap
          } else {
            keymap = keymap.s
          }
        } else {
          keymap = null
        }

        if (null == keymap && null == data && 0 < stars.length) {
          keymap = stars.pop()
        }
      } while (keymap)

      if (exact) {
        if (_.keys(foundkeys).length !== patlen) {
          data = null
        }
      } else {
        // If there's root data, return as a catch all
        if (null == data && void 0 !== top.d) {
          data = top.d
        }
      }

      if (finalfind) {
        data = finalfind.call(self, pat, data)
      }

      return data
    }

    self.remove = function(pat) {
      var keymap = top
      var data = null
      var key
      var path = []

      do {
        key = keymap.k

        if (keymap.v) {
          var nextkeymap = keymap.v[pat[key]]
          if (nextkeymap) {
            path.push({ km: keymap, v: pat[key] })
            data = nextkeymap.d
            keymap = nextkeymap
          } else {
            keymap = keymap.s
          }
        } else {
          keymap = null
        }
      } while (keymap)

      if (void 0 !== data) {
        var part = path[path.length - 1]
        if (part && part.km && part.km.v) {
          var point = part.km.v[part.v]
          if (!point.r || point.r(pat, point.d)) {
            delete point.d
          }
        }
      }
    }

    // values can be verbatim, glob, or array of globs
    self.list = function(pat, exact) {
      function descend(keymap, match, missing, acc) {
        if (keymap.v) {
          var key = keymap.k
          var gexval = gex(
            pat ? null == pat[key] ? exact ? null : '*' : pat[key] : '*'
          )
          var itermatch = _.extend({}, match)
          var itermissing = _.extend({}, missing)
          var nextkeymap

          for (var val in keymap.v) {
            if (gexval.on(val)) {
              var valitermatch = _.clone(itermatch)
              valitermatch[key] = val

              var valitermissing = _.extend({}, itermissing)
              delete valitermissing[key]

              nextkeymap = keymap.v[val]

              if (
                0 === _.keys(valitermissing).length &&
                nextkeymap &&
                nextkeymap.d
              ) {
                acc.push({
                  match: valitermatch,
                  data: nextkeymap.d,
                  find: nextkeymap.f
                })
              }

              if (nextkeymap && nextkeymap.v) {
                descend(
                  nextkeymap,
                  _.extend({}, valitermatch),
                  _.extend({}, valitermissing),
                  acc
                )
              }
            }
          }

          nextkeymap = keymap.s
          if (nextkeymap) {
            descend(
              nextkeymap,
              _.extend({}, itermatch),
              _.extend({}, itermissing),
              acc
            )
          }
        }
      }

      var acc = []

      if (top.d) {
        acc.push({
          match: {},
          data: top.d,
          find: top.f
        })
      }

      descend(top, {}, _.extend({}, pat), acc)
      return acc
    }

    self.toString = function() {
      var tree = _.isBoolean(arguments[0]) ? arguments[0] : !!arguments[1]

      var dstr = _.isFunction(arguments[0])
        ? arguments[0]
        : function(d) {
            return _.isFunction(d) ? '<' + d.name + '>' : '<' + d + '>'
          }

      function indent(o, d) {
        for (var i = 0; i < d; i++) {
          o.push(' ')
        }
      }

      var str = []

      function walk(n, o, d, vs) {
        var vsc

        if (void 0 !== n.d) {
          o.push(' ' + dstr(n.d))

          str.push(vs.join(', ') + ' -> ' + dstr(n.d))
        }
        if (n.k) {
          o.push('\n')
          indent(o, d)
          o.push(n.k + ':')
        }
        if (n.v) {
          d++
          var pa = _.keys(n.v)
          var pal = _.filter(pa, function(x) {
            return !x.match(/[\*\?]/)
          })
          var pas = _.filter(pa, function(x) {
            return x.match(/[\*\?]/)
          })
          pal.sort()
          pas.sort()
          pa = pal.concat(pas)

          for (var pi = 0; pi < pa.length; pi++) {
            var p = pa[pi]
            o.push('\n')
            indent(o, d)
            o.push(p + ' ->')

            vsc = _.clone(vs)
            vsc.push(n.k + '=' + p)

            walk(n.v[p], o, d + 1, vsc)
          }

          if (n.s) {
            o.push('\n')
            indent(o, d)
            o.push('|')

            vsc = _.clone(vs)
            walk(n.s, o, d + 1, vsc)
          }
        }
      }

      var o = []
      walk(top, o, 0, [])
      return tree ? o.join('') : str.join('\n')
    }

    self.inspect = self.toString

    self.toJSON = function(indent) {
      return JSON.stringify(
        top,
        function(key, val) {
          if (_.isFunction(val)) return '[Function]'
          return val
        },
        indent
      )
    }

    return self
  })

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = patrun
    }
    exports.patrun = patrun
  } else {
    root.patrun = patrun
  }
}.call(this))
