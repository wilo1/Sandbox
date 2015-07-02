var DAL = require('./DAL')
    .DAL;
var sio = require('socket.io');
var fs = require('fs');
var url = require("url");
var mime = require('mime');
var messageCompress = require('../client/lib/messageCompress')
    .messageCompress;
YAML = require('js-yaml');
var logger = require('./logger');
var xapi = require('./xapi');
var sandboxState = require('./sandboxState').sandboxState;

    //***node, uses REGEX, escape properly!
function strEndsWith(str, suffix)
    {
        return str.match(suffix + "$") == suffix;
    }
    //Is an event in the websocket stream a mouse event?
function isPointerEvent(message)
    {
        if (!message) return false;
        if (!message.member) return false;
        return (message.member == 'pointerMove' ||
            message.member == 'pointerHover' ||
            message.member == 'pointerEnter' ||
            message.member == 'pointerLeave' ||
            message.member == 'pointerOver' ||
            message.member == 'pointerOut' ||
            message.member == 'pointerUp' ||
            message.member == 'pointerDown' ||
            message.member == 'pointerWheel'
        )
    }


function SaveInstanceState(namespace, data, socket)
{
    if (!socket.loginData) return;
    var id = namespace;
    DAL.getInstance(id, function(state)
    {
        //state not found
        if (!state)
        {
            require('./examples.js')
                .getExampleMetadata(id, function(metadata)
                {
                    if (!metadata)
                    {
                        logger.info(id + "is not an example");
                        return;
                    }
                    else
                    {
                        if (socket.loginData.UID == global.adminUID)
                        {
                            require('./examples.js')
                                .saveExampleData(socket, id, data, function() {})
                        }
                        else
                        {
                            return;
                        }
                    }
                });
            return;
        }
        //not allowed to update a published world
        if (state.publishSettings.persistence == false)
        {
            return;
        }
        //not allowed to update a published world
        if (state.publishSettings.singlePlayer == true)
        {
            return;
        }
        //not currently checking who saves the state, so long as they are logged in
        DAL.saveInstanceState(id, data, function()
        {
            logger.info('saved');
            return;
        });
    });
}

var timeout = function(world)
{
    this.world = world;
    this.count = 0;
    this.time = function()
    {
        try
        {
            var loadClient = this.world.getLoadClient();
            if (loadClient)
            {
                this.count++;
                if (this.count < 5)
                {
                    logger.warn('did not get state, resending request', 2);
                    this.world.getStateTime = this.world.time;
                    //update 11/2/14
                    //if the last loadclient does not respond, pick a new client randomly
                    loadClient.emit('message', messageCompress.pack(JSON.stringify(
                    {
                        "action": "getState",
                        "respond": true,
                        "time": this.world.time
                    })));
                    socket.emit('message', messageCompress.pack(JSON.stringify(
                    {
                        "action": "status",
                        "parameters": ["Did not get state, resending request."],
                        "time": this.world.time
                    })));
                    this.handle = global.setTimeout(this.time.bind(this), 2000);
                }
                else
                {
                    logger.warn('sending default state', 2);
                    var state = this.world.state.getVWFDef();
                    //send cached state to all pending clients, drain their pending list, mark active
                    for (var i in this.world.clients)
                    {
                        var client = this.world.clients[i];
                        if (loadClient != client && client.pending === true)
                        {
                            logger.warn('sending default state 2', 2);
                            client.emit('message', messageCompress.pack(JSON.stringify(
                            {
                                "action": "status",
                                "parameters": ["State Not Received, Transmitting default"],
                                "time": this.namespace.getStateTime
                            })));
                            client.emit('message', messageCompress.pack(JSON.stringify(
                            {
                                "action": "createNode",
                                "parameters": [state],
                                "time": this.namespace.getStateTime
                            })));
                            client.pending = false;
                            for (var j = 0; j < client.pendingList.length; j++)
                            {
                                client.emit('message', client.pendingList[j]);
                            }
                            client.pendingList = [];
                        }
                    }
                }
            }
            else
            {
                logger.warn('need to load from db', 2);
            }
        }
        catch (e)
        {}
    }
    this.deleteMe = function()
    {
        global.clearTimeout(this.handle);
        this.world.requestTimer = null;
    }
    this.handle = global.setTimeout(this.time.bind(this), 6000);
}

function sandboxWorld(id, metadata)
{
    this.id = id;
    this.clients = {};
    this.time = 0.0;
    this.state = {};
    this.metadata = metadata;
    this.allowAnonymous = false;
    if (this.metadata.publishSettings && this.metadata.publishSettings.allowAnonymous)
        this.allowAnonymous = true;
    var log = null;
    try
    {
        var log = require('./logger').getWorldLogger(id);
    }
    catch (e)
    {
        logger.error(e.message + ' when opening ' + SandboxAPI.getDataPath() + '//Logs/' + id.replace(/[\\\/]/g, '_'));
    }
    this.events = {};
    this.on = function(name, callback)
    {
        if (!this.events[name])
            this.events[name] = [];
        this.events[name].push(callback)
    }
    this.removeListener = function(name, callback)
    {
        if (!this.events[name]) return;
        var index = this.events[name].indexOf(callback)
        if (index != -1)
            this.events[name].splice(index, 1);
    }
    this.trigger = function(name, e)
    {
        if (!this.events[name]) return;
        for (var i = 0; i < this.events[name].length; i++)
            this.events[name][i].apply(this, [e]);
    }
    this.addClient = function(socket)
    {
        this.clients[socket.id] = socket;
    }
    this.removeClient = function(socket)
    {
        delete this.clients[socket.id];
    }
    this.shutdown = function()
    {
        for (var i in this.clients)
            this.clients[i].disconnect();
        clearInterval(this.timerID);
        logger.warn('Shutting down ' + this.id)
        this.trigger('shutdown');
    }
    this.Log = function(message, level)
    {
        if (logger.logLevel >= level)
        {
            if (log)
                log.info(message);
            logger.info(message + '\n', level);
        }
    }
    this.getClientList = function()
    {
        var list = [];
        for (var k in this.clients)
            list.push(k);
        return list;
    }
    this.clientCount = function()
    {
        var i = 0;
        for (var k in this.clients)
            i++;
        return i;
    }
    this.getLoadClient = function()
    {
        var loadClient = null;
        var nonPendingClients = [];
        for (var i in this.clients)
        {
            var testClient = this.clients[i];
            if (!testClient.pending)
            { //&& testClient.loginData remove check - better to get untrusted data than a sync error
                nonPendingClients.push(testClient);
            }
        }
        //pick randomly, so if there are several and you need to try again, you don't keep hitting the same one
        loadClient = nonPendingClients[Math.floor(Math.random() * nonPendingClients.length - .001)];
        return loadClient;
    }
    this.Error = function(message, level)
    {
        if (logger.logLevel >= level)
        {
            if (log)
                log.error(message + '\n');
            logger.error(message);
        }
    }
    this.messageClient = function(client, message, ignorePending, resolvePending)
    {
        if (!client.pending || ignorePending)
            client.emit('message', message);
        else
        {
            client.pendingList.push(message)
        }
        if (resolvePending)
        {
            if (client.pending)
            {
                for (var j = 0; j < client.pendingList.length; j++)
                {
                    client.emit('message', client.pendingList[j]);
                }
                client.pendingList = [];
            }
        }
    }
    this.messageClients = function(message, ignorePending, resolvePending)
    {
        if (message.constructor != String)
        {
            message.instance = this.id;
            message = JSON.stringify(message);
        }
        //message to each user the join of the new client. Queue it up for the new guy, since he should not send it until after getstate
        var packedMessage = messageCompress.pack(message);
        for (var i in this.clients)
        {
            this.messageClient(this.clients[i], packedMessage, ignorePending, resolvePending);
        }
    }
    this.messageConnection = function(id, name, UID)
    {
        var joinMessage = {
            "action": "fireEvent",
            "parameters": ["clientConnected", [id, name, UID]],
            node: "index-vwf",
            "time": this.time
        };
        this.messageClients(joinMessage);
    }
    this.messageDisconnection = function(id, name, UID)
    {
        var joinMessage = {
            "action": "fireEvent",
            "parameters": ["clientDisconnected", [id, name, UID]],
            node: "index-vwf",
            "time": this.time
        };
        this.messageClients(joinMessage);
    }
    this.GetNextAnonName = function(socket)
    {
        return "Anonymous_" + socket.id
    }
    this.totalerr = 0;
    //instead of starting the timer when the object is initialzied, let's start the timer after the state has been served to the first client
    this.startTimer = function()
    {
        //keep track of the timer for this instance
        var self = this;
        if (self.timerID) return; //already started
        self.accum = 0;
        var timer = function()
        {
            var now = process.hrtime();
            now = now[0] * 1e9 + now[1];
            now = now / 1e9;
            if (!self.lasttime) self.lasttime = now;
            var timedelta = (now - self.lasttime) || 0;
            self.accum += timedelta;
            while (self.accum > .05)
            {
                self.accum -= .05;
                self.time += .05;
                self.ticknum++;
                var tickmessage = {
                    "action": "tick",
                    "parameters": [],
                    "time": self.time,
                    "origin": "reflector",
                };
                self.messageClients(tickmessage);
            }
            self.lasttime = now;
        }.bind(self);
        self.timerID = setInterval(timer, 5);
        console.warn("timer is " + self.timerID)
    }
    this.firstConnection = function(socket, cb)
    {
        logger.info('load from db', 2);
        socket.emit('message', messageCompress.pack(JSON.stringify(
        {
            "action": "status",
            "parameters": ["Loading state from database"],
            "time": this.time
        })));
        var instance = this.id;
        //Get the state and load it.
        //Now the server has a rough idea of what the simulation is
        var self = this;
        this.state = new sandboxState(this.id,this.metadata);
        this.state.on('loaded', function()
        {
            var scene = self.state.getVWFDef();
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "status",
                    "parameters": ["State loaded, sending..."],
                    "time": self.time
                })));
                console.log('got  blank scene');

                //note: don't have to worry about pending status here, client is first
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "createNode",
                    "parameters": [scene],
                    "time": self.time
                })));
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "startSimulating",
                    "parameters": ["index-vwf"],
                    "time": 0
                })));
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "fireEvent",
                    "parameters": ["loaded", []],
                    node: "index-vwf",
                    "time": self.time
                })));
                socket.pending = false;
                self.startTimer();
                cb();

        })
    }
    this.messagePeerConnected = function()
    {
        for (var i in this.clients)
        {
            this.clients[i].emit('message', messageCompress.pack(JSON.stringify(
            {
                "action": "status",
                "parameters": ["Peer Connected"],
                "time": this.time
            })));
        }
    }
    this.clientConnected = function(client)
    {
        client.setWorld(this);
        this.messagePeerConnected();
        //add the new client to the instance data
        this.addClient(client);
        //count anonymous users, try to align with the value used for hte displayname of the avatar
        if (client.loginData.UID == "Anonymous")
        {
            var anonName = this.GetNextAnonName(client);
            client.loginData.UID = anonName;
            client.loginData.Username = anonName;
        }
        client.pending = true;
        client.pendingList = [];
        //The client is the first, is can just load the index.vwf, and mark it not pending
        if (this.clientCount() == 1)
        {
            var self = this;
            this.firstConnection(client, function()
            {
                //this must come after the client is added. Here, there is only one client
                self.messageConnection(client.id, client.loginData ? client.loginData.Username : "", client.loginData ? client.loginData.UID : "");
            });
        }
        //this client is not the first, we need to get the state and mark it pending
        else
        {
            this.requestState();
            //loadClient.pending = true;
            client.emit('message', messageCompress.pack(JSON.stringify(
            {
                "action": "status",
                "parameters": ["Requesting state from clients"],
                "time": this.getStateTime
            })));
            //the below message should now queue for the pending socket, fire off for others
            this.messageConnection(client.id, client.loginData ? client.loginData.Username : "", client.loginData ? client.loginData.UID : "");
        }
    }
    this.requestState = function()
    {
        var loadClient = this.getLoadClient();
        logger.info('load from client', 2);
        //  socket.pending = true;
        this.getStateTime = this.time;
        loadClient.emit('message', messageCompress.pack(JSON.stringify(
        {
            "action": "status",
            "parameters": ["Server requested state. Sending..."],
            "time": this.getStateTime
        })));
        //here, we must reset all the physics worlds, right before who ever firstclient is responds to getState. 
        //important that nothing is between
        loadClient.emit('message', messageCompress.pack(JSON.stringify(
        {
            "action": "getState",
            "respond": true,
            "time": this.time,
            "origin": "reflector"
        })));
        this.Log('GetState from Client', 2);
        if (!this.requestTimer)
            this.requestTimer = new timeout(this);
    }
    this.message = function(msg, sendingclient)
    {
        try
        {
            //need to add the client identifier to all outgoing messages
            try
            {
                var message = JSON.parse(messageCompress.unpack(msg));
                message.time = this.time;
            }
            catch (e)
            {
                return;
            }
            //logger.info(message);
            message.client = sendingclient.id;
            if (message.action == "saveStateResponse")
            {
                SaveInstanceState(this.id, message.data, sendingclient);
                return;
            }

            //do not accept messages from clients that have not been claimed by a user
            //currently, allow getstate from anonymous clients
            if (!this.allowAnonymous && !sendingclient.loginData && message.action != "getState" && message.member != "latencyTest")
            {
                return;
            }

            //route callmessage to the state to it can respond to manip the server side copy
            if (message.action == 'callMethod')
                this.state.callMethod(message.node, message.member, message.parameters);

            if (message.action == 'callMethod' && message.node == 'index-vwf' && message.member == 'PM')
            {
                var textmessage = JSON.parse(message.parameters[0]);
                if (textmessage.receiver == '*System*')
                {
                    var red, blue, reset;
                    red = '\u001b[31m';
                    blue = '\u001b[33m';
                    reset = '\u001b[0m';
                    logger.warn(blue + textmessage.sender + ": " + textmessage.text + reset, 0);
                }
                //send the message to the sender and to the receiver
                if (textmessage.receiver)
                    this.clients[textmessage.receiver].emit('message', messageCompress.pack(JSON.stringify(message)));
                if (textmessage.sender)
                    this.clients[textmessage.sender].emit('message', messageCompress.pack(JSON.stringify(message)));
                return;
            }
            // only allow users to hang up their own RTC calls
            var rtcMessages = ['rtcCall', 'rtcVideoCall', 'rtcData', 'rtcDisconnect'];
            if (message.action == 'callMethod' && message.node == 'index-vwf' && rtcMessages.indexOf(message.member) != -1)
            {
                var params = message.parameters[0];
                // allow no transmitting of the 'rtc*Call' messages; purely client-side
                if (rtcMessages.slice(0, 2)
                    .indexOf(message.member) != -1)
                    return;
                // route messages by the 'target' param, verifying 'sender' param
                if (rtcMessages.slice(2)
                    .indexOf(message.member) != -1 &&
                    params.sender == socket.id
                )
                {
                    var client = this.clients[params.target];
                    if (client)
                        client.emit('message', messageCompress.pack(JSON.stringify(message)));
                }
                return;
            }
            //We'll only accept a setProperty if the user has ownership of the object
            if (message.action == "deleteNode" || message.action == "createMethod" || message.action == "createProperty" || message.action == "createEvent" ||
                message.action == "deleteMethod" || message.action == "deleteProperty" || message.action == "deleteEvent" || message.action == "setProperty")
            {
                if (!this.state.validate(message.action, message.node, sendingclient))
                {
                    return;
                }

                }
            if (message.action == "setProperty")
                this.state.setProperty(message.node, message.member, message.parameters[0]);
            //We'll only accept a deleteNode if the user has ownership of the object
            if (message.action == "deleteNode")
            {
                    this.state.deleteNode(message.node)
                    xapi.sendStatement(sendingclient.loginData.UID, xapi.verbs.derezzed, message.node, node.properties ? node.properties.DisplayName : "", null, this.id);
                }
            //We'll only accept a createChild if the user has ownership of the object
            //Note that you now must share a scene with a user!!!!
            if (message.action == "createChild")
            {
                var childComponent = JSON.parse(JSON.stringify(message.parameters[0]));
                if (!this.state.validateCreate(message.node, childComponent, sendingclient))
                {
                    return;
                }
                var childID = this.state.createChild(message.node, message.member, childComponent)
                console.log("created: " + childID)
                    xapi.sendStatement(sendingclient.loginData.UID, xapi.verbs.rezzed, childID, childComponent.properties.DisplayName, null, this.id);


                }
            
            var compressedMessage = messageCompress.pack(JSON.stringify(message))
                //distribute message to all clients on given instance
            for (var i in this.clients)
            {
                var client = this.clients[i];
                //if the message was get state, then fire all the pending messages after firing the setState
                if (message.action == "getState" && client.pending == true)
                {
                    this.Log('Got State', 2);
                    if (this.requestTimer)
                        this.requestTimer.deleteMe();
                    var state = message.result;
                    this.state.setVWFDef(JSON.parse(JSON.stringify(state)));
                    client.emit('message', messageCompress.pack(JSON.stringify(
                    {
                        "action": "status",
                        "parameters": ["State Received, Transmitting"],
                        "time": this.getStateTime
                    })));
                    client.emit('message', messageCompress.pack(JSON.stringify(
                    {
                        "action": "setState",
                        "parameters": [state],
                        "time": this.getStateTime
                    })));
                    client.pending = false;
                    for (var j = 0; j < client.pendingList.length; j++)
                    {
                        client.emit('message', client.pendingList[j]);
                    }
                    client.pendingList = [];
                }
                else
                {
                    //just a regular message, so push if the client is pending a load, otherwise just send it.
                    if (client.pending == true)
                    {
                        client.pendingList.push(compressedMessage);
                        logger.debug('PENDING', 2);
                    }
                    else
                    {
                        //simulate latency
                        if (global.latencySim > 0)
                        {
                            (function(__client, __message)
                            {
                                global.setTimeout(function()
                                {
                                    __client.emit('message', __message);
                                }, global.latencySim)
                            })(client, compressedMessage);
                        }
                        else
                        {
                            client.emit('message', compressedMessage);
                        }
                    }
                }
            }
            if (message.action == "createChild")
            {
                console.log('client simulate own node:' + childID)
                this.messageClient(sendingclient, messageCompress.pack(JSON.stringify(
                {
                    "action": "startSimulating",
                    "parameters": [childID],
                    "time": this.time
                })));
            }

        }
        catch (e)
        {
            //safe to catch and continue here
            logger.error('Error in reflector: onMessage');
            logger.error(e);
            logger.error(e.stack);
        }
    }
    this.disconnect = function(client)
    {
        logger.info(client.id);
        logger.info(Object.keys(this.clients));
        this.removeClient(client);
        logger.info(this.clientCount());

        xapi.sendStatement(client.loginData.UID, xapi.verbs.left, this.id, this.metadata.title, this.metadata.description, this.id);

        if (this.clientCount() == 0)
        {
            this.shutdown();
        }
        else
        {
            try
            {
                var loginData = client.loginData;
                logger.debug(client.id, loginData, 2)
                    //thisInstance.clients[socket.id] = null;
                    //if it's the last client, delete the data and the timer
                    //message to each user the join of the new client. Queue it up for the new guy, since he should not send it until after getstate
                this.messageDisconnection(client.id, client.loginData ? client.loginData.Username : null);
                if (loginData && loginData.clients)
                {
                    console.log("Disconnect. Deleting node for user avatar " + loginData.UID);
                    var avatarID = 'character-vwf-' + loginData.UID;
                    this.messageClients(
                    {
                        "action": "deleteNode",
                        "node": avatarID,
                        "time": this.time
                    });
                    this.messageClients(
                    {
                        "action": "callMethod",
                        "node": 'index-vwf',
                        member: 'cameraBroadcastEnd',
                        "time": this.time,
                        client: socket.id
                    });
                    this.messageClients(
                    {
                        "action": "callMethod",
                        "node": 'index-vwf',
                        member: 'PeerSelection',
                        parameters: [
                            []
                        ],
                        "time": this.time,
                        client: socket.id
                    });
                    this.state.deleteNode(avatarID);
                }
                this.messageClients(
                {
                    "action": "status",
                    "parameters": ["Peer disconnected: " + (loginData ? loginData.UID : "Unknown")],
                    "time": this.getStateTime
                });
                console.log('clientcount is ' + this.clientCount());
                console.log(this.getClientList());
            }
            catch (e)
            {
                logger.error('error in reflector disconnect')
                logger.error(e);
            }
        }
    }
}
exports.sandboxWorld = sandboxWorld;