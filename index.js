#! /usr/bin/env node
const program = require('commander');
const express = require('express');
const pino = require('pino');
const chalk = require('chalk');
const merge = require('lodash/merge');
const packageJson = require('./package');
const request = require('request');
const path = require('path');
const os = require('os');

function getLocalExternalInterfaces() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces).reduce((acc, key) => {
        return acc.concat(interfaces[key].filter(({family}) => family.toLowerCase() === 'ipv4'));
    }, []);
}

const defaultConfig = {
    host: 'http://localhost:8080',
    baseUrl: '/',
    port: 1234,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'X-Powered-By': 'cors-backdoor'
    },
    debug: {
        name: 'cors-backdoor',
        level: 'trace',
        prettyPrint: false
    }
};

program
    .version(packageJson.version)
    .option('-h, --host [host]', 'The URL to proxy')
    .option('-p, --port [port]', 'The port to use. Defaults to 1234')
    .option('-b, --base-url [baseUrl]')
    .option('-c, --config [configPath]', 'A path to a JSON config file for advanced configuration')
    .parse(process.argv);

let externalConfig = {};

if (program.config) {
    try {
        externalConfig = require(path.resolve(process.cwd(), program.config));
        console.log(chalk`\n{gray Loaded config file} ✅ `);
    } catch (e) {
        console.error(chalk.red('Failed to load the specified external configuration file. ❌\nResorting to default configuration'), e);
    }
}

const {host: cmdHost, port: cmdPort, baseUrl: cmdBaseUrl} = program;
const config = merge({}, defaultConfig, {
    host: cmdHost,
    port: cmdPort,
    baseUrl: cmdBaseUrl
}, externalConfig);
let {host, port, baseUrl} = config;
host = host.replace(/\/$/, '');
const logger = pino(config.debug);

const proxy = express();

proxy.use((req, res, next) => {
    const {headers} = config;
    const {method} = req;

    const _overrideResponseHeaders = {};
    Object.keys(headers).forEach(key => {
        switch (typeof headers[key]) {
            case 'function':
                _overrideResponseHeaders[key] = headers[key](req) || undefined;
                break;
            default:
                _overrideResponseHeaders[key] = headers[key];
        }
        _overrideResponseHeaders[key] && res.setHeader(key, _overrideResponseHeaders[key]);
    });

    if (method.toLowerCase() === 'options') {
        res.status(200);
        res.send('');
    }
    req._overrideResponseHeaders = _overrideResponseHeaders;
    next();
});
proxy.use(`${baseUrl}`, (req, res) => {
    const {method, path, originalUrl, body, headers, _overrideResponseHeaders} = req;

    const targetUrl = `${host}${req.url}`;

    logger.trace({
        req: {method, path, originalUrl, body, headers},
        targetUrl
    }, 'Proxy Request: %s %s', [method, originalUrl]);

    const requestStream = req.pipe(request(targetUrl));
    const responseStream = requestStream.pipe(res);

    requestStream.on('response', res =>
        res.headers = JSON.parse(JSON.stringify({...res.headers, ..._overrideResponseHeaders})));
    requestStream.on('error', e => logger.error(e));

    responseStream.on('error', e => logger.error(e));
    responseStream.on('finish', () => logger.debug({
        req: {
            method,
            path,
            originalUrl,
            body,
            headers
        }
    }, 'Proxy Complete: %s %s', [method, originalUrl]));
});

proxy.listen(config.port, () => {

    console.log(chalk`\n{green Backdoor to} {yellowBright ${host}} {green initialised on port} {yellowBright ${port}} 🐙`);
    console.log(chalk`\n{green Available Backdoor Interfaces:}`);
    [{address: 'localhost'}, ...getLocalExternalInterfaces()]
        .forEach(({address}) => console.log(chalk`\n\t🚪 {yellowBright http://${address}:${port}${baseUrl}}`));
    console.log(`\n`);
    logger.info({config}, `Proxy server running on ${config.port}`);
});