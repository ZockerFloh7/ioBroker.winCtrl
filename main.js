'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require('fs');

class Winctrl extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
     */
    constructor(options) {
        super({
            ...options,
            name: 'winctrl',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        this.log.info('WinCtrl adapter started!');

        // Reset the connection indicator during startup
        //this.setState('info.connection', false, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        //this.createHttpServer();
        const clientIp = this.config.clientIp || '127.0.0.1';
        this.log.info(`Client IP:${clientIp}`);
        const port = this.config.port || '8085';
        this.log.info(`Client IP: ${port}`);
        /*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables

		IMPORTANT: State roles should be chosen carefully based on the state's purpose.
		           Please refer to the state roles documentation for guidance:
		           https://www.iobroker.net/#en/documentation/dev/stateroles.md
		*/
        await this.setObjectNotExistsAsync('command', {
            type: 'state',
            common: {
                name: 'command',
                type: 'string',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });

        await this.setObjectNotExistsAsync('response', {
            type: 'state',
            common: {
                name: 'status',
                type: 'string',
                role: 'value',
                read: true,
                write: false,
            },
            native: {},
        });

        await this.setObjectNotExistsAsync('status', {
            type: 'state',
            common: {
                name: 'status',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                min: 0,
                max: 599,
            },
            native: {},
        });

        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        this.subscribeStates('command');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');

        /*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
        // the variable testVariable is set to true as command (ack=false)
        //await this.setState('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        //await this.setState('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        //await this.setState('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        /*const pwdResult = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info(`check user admin pw iobroker: ${pwdResult}`);

        const groupResult = await this.checkGroupAsync('admin', 'admin');
        this.log.info(`check group user admin group admin: ${groupResult}`);*/
    }

    async httpGet(url) {
        try {
            const response = await fetch(url);
            const status = response.status;
            const data = await response.text();
            return { status, data };
        } catch (error) {
            throw new Error(`HTTP Fehler: ${error.message}`);
        }
    }

    createHttpServer() {
        const http = require('http');
        const url = require('url');

        this.server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url || '/', true);
            const pathname = parsedUrl.pathname;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // GET /status
            if (req.method === 'GET' && pathname === '/status') {
                res.statusCode = 200;
                res.end(
                    JSON.stringify({
                        status: 'ok',
                        uptime: process.uptime(),
                        clientip: this.config.clientIp,
                    }),
                );
                // GET /ping
            } else if (req.method === 'GET' && pathname === '/ping') {
                res.statusCode = 200;
                res.end('pong');

                // Unbekannt
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'command not found' }));
            }
        });

        const port = this.config.port || 8085;
        this.server.listen({ port: port, host: '0.0.0.0' }, () => {
            this.log.info(`HTTP Server listening on port ${port}`);
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback - Callback function
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            if (this.server) {
                this.server.close();
            }

            callback();
        } catch (error) {
            this.log.error(`Error during unloading: ${error.message}`);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    /*onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        }
    }*/

    /**
     * Is called if a subscribed state changes
     *
     * @param {string} id - State ID
     * @param {ioBroker.State | null | undefined} state - State object
     */
    async onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

            if (state.ack === false) {
                // This is a command from the user (e.g., from the UI or other adapter)
                // and should be processed by the adapter
                this.log.info(`User command received for ${id}: ${state.val}`);

                const targetUrl = `http://${this.config.clientIp}:${this.config.port}/${state.val}`;
                const result = await this.httpGet(targetUrl);
                this.setState('response', result.data || 'error', true);
                this.setState('status', result.status || 'error', true);
                this.log.info(`Response HTTP status ${result.status}: ${result.data}`);
            }
        } else {
            // The object was deleted or the state value has expired
            this.log.info(`state ${id} deleted`);
        }
    }
    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
     */
    module.exports = options => new Winctrl(options);
} else {
    // otherwise start the instance directly
    new Winctrl();
}
