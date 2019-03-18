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


/**
 * Helper to get a list of available external network interfaces
 * to generate a list of URLs for the proxy server
 * @returns {Array<string>} A list of available local external network interfaces
 */
function getLocalExternalInterfaces() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces).reduce((acc, key) => {
        return acc.concat(interfaces[key].filter(({family}) => family.toLowerCase() === 'ipv4'));
    }, []);
}

/**
 * @typedef HeaderOverrides
 * A key-value map where the key is the header name and the value determines the header value that will be used.
 * If the value is a string, the string value will be used for the header specified by the key.
 * If the value is undefined, the header is removed entirely
 * If the value is a function, the function is invoked for every request and it's return value will be used similar to
 * the rules above. The function will be passed the Express req object as it's first argument
 * @type Object
 */

/**
 * @typedef Configuration
 * @type Object
 * @property {string} host - The host to proxy
 * @property {Number} [port] - The port to run the proxy server on
 * @property {string} [baseUrl] - The base URL to use for the proxied requests
 * @property {HeaderOverrides} [headers] - The header overrides Object
 * @property {Object} [debug] - The options to pass to pino
 */

/**
 * Default configuration
 * @type {Configuration}
 */
const defaultConfig = {
    baseUrl: '/',
    port: 1234,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': function (req) {
            return req.headers['access-control-request-headers'];
        },
        'X-Powered-By': 'cors-backdoor'
    },
    debug: {
        name: 'cors-backdoor',
        level: 'trace',
        prettyPrint: false
    }
};

// Parse the parameters
program
    .version(packageJson.version)
    .option('-t, --target [target]', 'The URL to proxy')
    .option('-p, --port [port]', 'The port to use. Defaults to 1234')
    .option('-b, --base-url [baseUrl]')
    .option('-c, --config [configPath]', 'A path to a JSON config file for advanced configuration')
    .parse(process.argv);

let externalConfig = {};

if (program.config) {
    // Attempt to load external config if the config option is used
    try {
        externalConfig = require(path.resolve(process.cwd(), program.config));
        console.log(chalk`\n{gray Loaded config file} ✅ `);
    } catch (e) {
        console.error(chalk.red('Failed to load the specified external configuration file. ❌\nResorting to default configuration'), e);
    }
}

// Extract options parsed from the command line
const {target: cmdTarget, port: cmdPort, baseUrl: cmdBaseUrl} = program;

// Create merged configuration: defaultConfig < cmdConfig < externalConfig
const config = merge({}, defaultConfig, {
    target: cmdTarget,
    port: cmdPort,
    baseUrl: cmdBaseUrl
}, externalConfig);

// Use target, port, baseUrl from merged config
let {target, port, baseUrl} = config;

// Create Logger Instance
const logger = pino(config.debug);

if (!target) {
    console.error(chalk.red('Missing `target` parameter. Aborting'));
    process.exit(1);
}

// Normalise target URL - remove trailing slash
target = target.replace(/\/$/, '');


// Create Express App
const proxy = express();

// Middleware to add in res helper to override headers
proxy.use((req, res, next) => {
    res.applyHeaderOverrides = () => {

        Object.keys(config.headers).forEach(key => {

                // Normalise value to an array if it;s not already one
                const values = Array.isArray(config.headers[key]) ? config.headers[key] : [config.headers[key]];

                // Combine array values into a single comma separated list
                const combinedValue = values
                // If the item is a function, call it passing req as a parameter and use it's return value for the header value.
                    .map(value => (typeof value === 'function' ? value(req, res) : value))
                    // Remove any `undefined` values
                    .filter(value => value !== undefined)
                    // Join by `,`
                    .join(',');

                if (combinedValue) {
                    // There is a valid value, set the header `key` to `combinedValue`
                    res.setHeader(key, combinedValue);
                } else {
                    // No valid value was found. Remove the header
                    res.removeHeader(key);
                }
            }
        );

        return res;
    };
    next();
});

// Respond to OPTIONS requests with a 200
proxy.use((req, res, next) => {
    if (req.method.toLowerCase() === 'options') {
        return res.status(200).applyHeaderOverrides().send('');
    }
    next();
});

// Proxy other requests to target/baseURl
proxy.use(`${baseUrl}`, (req, res) => {
    const {method, path, originalUrl, body, headers} = req;

    // Build target URL
    const targetUrl = `${target}${req.url}`;

    // Trace request information
    logger.trace({
        req: {method, path, originalUrl, body, headers},
        targetUrl
    }, 'Proxy Request: %s %s', method, originalUrl);

    // Create a request stream to the target and pipe the request to it
    const requestStream = req.pipe(request(targetUrl));

    // Pipe the results of the request to the target to the response
    const responseStream = requestStream.pipe(res);

    // Apply the header overrides when the response stream is available
    requestStream.on('response', res.applyHeaderOverrides);

    // Report any errors from the request stream
    requestStream.on('error', e => logger.error(e));

    // Report any errors from the response stream
    responseStream.on('error', e => logger.error(e));

    // Log debug message when proxy is complete
    responseStream.on('finish', () => logger.debug('Proxy Complete: %s %s', method, originalUrl));
});

// Start proxy server on the port derived from the merged config
proxy.listen(config.port, () => {
        console.log(chalk`\n{green Backdoor to} {yellowBright ${target}} {green initialised on port} {yellowBright ${port}} 🐙`);
        console.log(chalk`\n{green Available Backdoor Interfaces:}`);
        [{address: 'localhost'}, ...getLocalExternalInterfaces()]
            .forEach(({address}) => console.log(chalk`\n\t🚪 {yellowBright http://${address}:${port}${baseUrl}}`));
        console.log(`\n`);
        logger.info({config}, `Proxy server running on ${config.port}`);
    })
    .on('error', error => {
        if (error && error.code === 'EADDRINUSE') {
            console.error(chalk.red(`EADDRINUSE: The port ${config.port} is busy. Please release the port and try again or start cors-backdoor on a different port using the --port option`));
            return process.exit(0);
        }
        console.error(chalk.red(`Unknown error. Please check your configuration and try again`), e);
        process.exit(1);
    });