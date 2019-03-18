---
layout: default
---

## Installation

Install as a global module (recommended)
```sh
npm install -g cors-backdoor
```
Install as a dev dependency

```sh
npm install -D cors-backdoor
```

## Quick Start


```sh
cors-backdoor --target http://api.example.com
```

This will start a local proxy running on the port `1234` for the target `http://api.example.com`. The client will have to 
be reconfigured to make requests which looked like `http://api.example.com/posts` to `http://localhost:1234/posts` 
instead

## What is CORS?:
Cross-Origin Resource Sharing (CORS) is a mechanism that uses additional HTTP headers to tell a browser to let a web 
application running at one origin (domain) have permission to access selected resources from a server at a different 
origin. A web application executes a cross-origin HTTP request when it requests a resource that has a different origin 
(domain, protocol, and port) than its own origin. [More detail in the MDN article on the topic](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## CORS errors:
If the CORS configuration isn't setup correctly, the browser console will present an error like "Cross-Origin Request 
Blocked: The Same Origin Policy disallows reading the remote resource at $somesite" indicating that the request was 
blocked due to violating the CORS security rules. It is usually fixed on the server-side by responding to `OPTIONS` 
requests correctly and setting correct response headers on the server-side. [enable-cors.org](https://enable-cors.org/) 
has instructions for setting this up on different platforms. 

However, during development it may not be feasible or desirable to do the required configuration on the server. This 
tool creates a local proxy server which handles CORS requests properly and provides a work around for accessing 
cross-origin resources without having to change the server configuration. This is typically useful during frontend 
development for an app which typically accesses an API on the same origin in production but has to make CORS requests 
during development.

## Solution: cors-backdoor

This utility creates a local expressjs server which proxies the requests to the cross origin resource provider (An API 
hosted on a different domain, for example) and handles the CORS requirements as needed. The client application can then
make requests to the created local proxy server instead of the actual resource provider and work around CORS error 
temporarily.

###### NOTE: This utility is for development purposes only. Use for production is strongly discouraged. Visit [enable-cors.org](https://enable-cors.org/) for platform specific instructions on how CORS requests be handled correctly on the server side.


##### How it works:

Every request sent to cors-backdoor, is processed as follows:

1. Append the configured base-url and stream the request to the specified `target`.
2. Once the response stream is available, override headers of the response with the configured CORS headers and send 
the response to the client
3. Handle any OPTIONS request by sending a `200` response

## CLI API

```sh
cors-backdoor --target <target> [--port <port> ] [--base-url <base-url>] [--config path/to/config.js]

```

| Option | Parameter | Description |
| ------ | --------- | ----------- |
| -h, --help | | Show the help menu |
| -t, --target | target *required*  | Target host to proxy requests to. Ex: `--target http://api.example.com` |
| -p, --port | port *optional* | The port on which the proxy server should run. Defaults to `1234` |
| -b, --base-url | baseUrl *optional* | The optional base URL to proxy onto the target. For example, if the option `--base-url /api/v1` is used, a request to the proxy server of the form `http://localhost:<port>/posts` will be proxied to the specified `target` as `<target>/api/v1/posts`. Defaults to `/` |
| -c, --config | configPath *optional* | The file path to the configuration to use for advanced configuration. See the advanced configuration section below. |
 
 
 Any options passed via a configuration file will override an conflicting options from the command line parameters.
 
 ## Advanced Configuration
 
 Sometimes, the default headers set by `cors-backdoor` are not enough (for example, if a custom response header needs 
 to be explicitly exposed using `Access-Control-Expose-Headers`).
 
 To work around this, `cors-backdoor` provides a configuration framework to customise the headers
 set on the proxied response. The configuration file which is a javascript or JSON file allows configuration of all 
 CLI parameters in addition to providing the capability to override the headers.
 
 All keys are optional in the configuration (Note: `target` is required and it must be provided either via CLI options 
 or an external config file)
 
 Here is a sample configuration file:
 
 ```js
// cors-backdoor-config.js
module.exports = {
    
    // Same as the CLI target parameter
    target: 'http://api.example.com',
    
    // Same as the CLI basePath parameter
    baseUrl: '/api/v1',
    
    // Same as the CLI port parameter
    port: 8010,
    
    // Custom Headers
    headers: {
        // Set the common CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, customer-id',
        
        // Expose some custom header
        'Access-Control-Expose-Headers': 'x-some-custom-header',
        
        // Remove the x-powered-by header
        'x-powered-by': undefined,
        
        // Set a custom header dynamically
        'x-req-status': function(req, res){
            return req.method;
        }
    },
    
    // Logger Options
    debug: {
        name: 'cors-backdoor',
        level: 'trace',
        prettyPrint: true
    }
};
```

### CLI Options

`target`, `baseUrl` and `port` options can also be via the configuration file. Values in the configuration file take 
precedence over the values passed via CLI options


### Header Overrides

The headers map in the configuration file can be used to override the headers on the proxied responses. The headers 
object should look something like:

```js
{
    '<header-name>':'<header-value>',
    ...
}
```

Where `header-name` is the name of the header to be set ex: `Access-Control-Allow-Origin` and `header-value` can either 
be a 
- `string` to set the header to the specified string value or a 
- `undefined` to remove the header from the response headers entirely.
- `function` which is invoked for every request passing the express req and res objects as it's parameters. It's return 
value is used as the header value and respects the two rules above. the header
- `Array<string|undefined|function>` A list of the three types above to set multiple values. The final values are joined
by `,`

##### Dynamic Header Overrides

Response headers can be set on a per request basis programmatically by setting the `header-value` in the headers map to 
be a function. In this case the config file obviously **has** to be a js file and not a JSON.

The callback function is invoked with the [express `req` object](https://expressjs.com/en/api.html#req) as it's first 
argument and [express `res` object](https://expressjs.com/en/api.html#res) as it's second argument at the time of 
proxying and it's return value determines the header value defined by `header-name`. 

The return value can be a `string` to set the header to the specified string value or `undefined` to remove the header 
from the response headers entirely.

Example:

 ```js
// cors-backdoor-config.js
module.exports = {
    
    // Same as the CLI target parameter
    target: 'http://api.example.com',
    
    // Custom Headers
    headers: {
        // Set a custom header dynamically
        'x-req-status': function(req, res){
            return req.method;
        }
    }
};
```


### Logger Options

`cors-backdoor` uses [Pino](http://getpino.io/#/) for logging. The `debug` key in the configuration enables passing in
additional configuration for pino. [Docs for Pino Options](http://getpino.io/#/docs/api?id=options-object).


```js
// cors-backdoor-config.js
module.exports = {
   
    // Pino Options
    debug: {
        name: 'cors-backdoor',
        
        // Set the logger level. See more below
        level: 'trace',
        
        // Turn on pretty printing (causes a reduction in performance but should be okay for local development)
        prettyPrint: true
    }
};
```


`cors-backdoor` uses different log levels for various levels of visibility. By default, every proxied request is logged
along with some request metadata. The can be modified by setting the `level` option in the logger configuration

| level  | Logs |
| -------| ---- |
| silent | Turns of request logging |
| error  | Logs only errors |
| debug  | Logs the path and method for every completed request proxy |
| trace  | Logs a detailed dump of `req` for every request | 


## Acknowledgement

Made with :heart: at  [<img height=16 src="https://raw.githubusercontent.com/drishtilabs/cors-backdoor/master/res/drishti-logo.png" /> Drishti Labs](https://drishti.com)



