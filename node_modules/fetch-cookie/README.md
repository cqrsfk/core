# fetch-cookie [![npm version](http://img.shields.io/npm/v/fetch-cookie.svg?style=flat-square)](https://www.npmjs.org/package/fetch-cookie)

> Decorator for a `fetch` function to support automatic cookies.

Description
-----------

This library is more suited to use with a Node.js `fetch` implementation
like [node-fetch], since the browser version is supposed to let a way
[to include cookies in requests][include].

[node-fetch]: https://www.npmjs.com/package/node-fetch
[include]: http://updates.html5rocks.com/2015/03/introduction-to-fetch#sending-credentials-with-a-fetch-request

Usage
-----

```js
var fetch = require('fetch-cookie')(require('node-fetch'))
```

If you want to customize the [tough-cookie][] [`CookieJar`][cookie-jar]
instance (for example, with a custom store), you can inject it as a
second argument.

[tough-cookie]: https://www.npmjs.com/package/tough-cookie
[cookie-jar]: https://github.com/SalesforceEng/tough-cookie#cookiejar

All calls to `fetch` will store and send back cookies according to the URL.

Cookies and redirection
-----------------------

By default, cookies are not set correctly in the edge case where a response
sets cookies and redirects to another URL. A real-life example of this behaviour
is a login page setting a session cookie and redirecting.

The reason for this limitation is that the generic fetch API does not allow any way to
hook into redirects. However, the [node-fetch] library does expose its own API which
we can use.

Long story short: if cookies during indirection turns out to be a requirement for you,
and if you are using [node-fetch], then you can use the custom node-fetch decorator
provided with this library:

```js
var fetch = require('fetch-cookie/node-fetch')(require('node-fetch'))
```
