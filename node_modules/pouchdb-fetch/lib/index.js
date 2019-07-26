'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var nodeFetch = require('node-fetch');
var nodeFetch__default = _interopDefault(nodeFetch);
var fetchCookie = _interopDefault(require('fetch-cookie'));

var fetch = fetchCookie(nodeFetch__default);

/* We can fake the abort, the http adapter keeps track
   of ignoring the result */
function AbortController() {
  return {abort: function () {}};
}

exports.Headers = nodeFetch.Headers;
exports.fetch = fetch;
exports.AbortController = AbortController;
