module.exports = {
    "/*": {
        changeOrigin: true,
	target: "http://amqbrokera.mycompany.com:8161/console/jolokia",
        secure: false,
        logLevel: "debug",
        pathRewrite: {
        "^/api": ""
        },     
        onProxyRes: (proxyRes, req, res) => {
           proxyRes.headers['Access-Control-Allow-Origin'] = 'http://amqbrokera.mycompany.com:4200/';
        },
        onProxyReq: (proxyReq, req, res) => {
           proxyReq.headers['Origin'] = 'http://amqbrokera.mycompany.com:4200/'; 
        }
    }
};

