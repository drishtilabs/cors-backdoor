module.exports = {
    target: 'https://api.example.com',
    baseUrl: '/',
    port: 8010,
    headers: {
        // String override
        'Access-Control-Expose-Headers': 'x-custom-exposed-header',

        // Function override
        'X-Custom-Req-Method': function (req) {
            return req.method;
        },

        //Set multiple values
        'Access-Control-Allow-Headers': [
            'Content-Type',
            function (req) {
                return req.headers['access-control-request-headers'];
            }
        ],

        // Remove header
        'x-powered-by': undefined
    },
    debug: {
        name: 'cors-backdoor',
        level: 'debug',
        prettyPrint: true
    }
};
