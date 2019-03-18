# cors-backdoor

<img width=200 height=200 src="https://raw.githubusercontent.com/drishtilabs/cors-backdoor/master/res/logo.png?sanitize=true&raw=true" />

A CORS-friendly local proxy to access cross origin resources


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


## [Documentation](https://drishtilabs.github.io/cors-backdoor/)
CLI API, Advanced configuration and more in the [documantation page](https://drishtilabs.github.io/cors-backdoor/)

