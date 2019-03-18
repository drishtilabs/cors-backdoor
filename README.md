# cors-backdoor

<img width=200 height=200 src="https://raw.githubusercontent.com/drishtilabs/cors-backdoor/master/res/logo.png?sanitize=true&raw=true" />

A CORS-friendly local proxy to access cross origin resources

A temporary workaround for common CORS errors like:

```sh

Access to fetch at 'http://api.example.com/posts' from origin 'http://localhost:8082' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.

Access to fetch at 'http://api.example.com/posts' from origin 'http://localhost:8082' has been blocked by CORS policy: Request header field content-type is not allowed by Access-Control-Allow-Headers in preflight response.
```

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


## [Documentation](https://drishtilabs.github.io/cors-backdoor/?ref=readme)
CLI API, Advanced configuration and more on  the docs page [https://drishtilabs.github.io/cors-backdoor](https://drishtilabs.github.io/cors-backdoor/?ref=readme)

