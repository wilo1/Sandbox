var DAL = require('./DAL')
    .DAL;
var sio = require('socket.io');
var fs = require('fs');
var url = require("url");
var mime = require('mime');
var sessions = require('./sessions.js');
var messageCompress = require('../client/lib/messageCompress')
    .messageCompress;
var connect = require('connect'),
    parseSignedCookie = connect.utils.parseSignedCookie,
    cookie = require('express/node_modules/cookie');
YAML = require('js-yaml');
var logger = require('./logger');
var xapi = require('./xapi');
//Check that a user has permission on a node
function checkOwner(node, name)
    {
        var level = 0;
        if (!node.properties) node.properties = {};
        if (!node.properties.permission) node.properties.permission = {}
        var permission = node.properties['permission'];
        var owner = node.properties['owner'];
        if (owner == name)
        {
            level = Infinity;
            return level;
        }
        if (permission)
        {
            level = Math.max(level ? level : 0, permission[name] ? permission[name] : 0, permission['Everyone'] ? permission['Everyone'] : 0);
        }
        var parent = node.parent;
        if (parent)
            level = Math.max(level ? level : 0, checkOwner(parent, name));
        return level ? level : 0;
    }
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
    //change up the ID of the loaded scene so that they match what the client will have
var fixIDs = function(node)
{
    if (node.children)
        var childnames = {};
    for (var i in node.children)
    {
        childnames[i] = null;
    }
    for (var i in childnames)
    {
        var childComponent = node.children[i];
        var childName = childComponent.name || i;
        var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
        childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
        childComponent.id = childID;
        node.children[childID] = childComponent;
        node.children[childID].parent = node;
        delete node.children[i];
        fixIDs(childComponent);
    }
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

function stateToScene(state, instanceData, cb)
{
    var state2 = JSON.parse(JSON.stringify(state));
    fs.readFile("./public" + "/adl/sandbox" + "/index.vwf.yaml", 'utf8', function(err, blankscene)
    {
        var err = null;
        try
        {
            blankscene = YAML.load(blankscene);
            blankscene.id = 'index-vwf';
            blankscene.patches = "index.vwf";
            if (!blankscene.children)
                blankscene.children = {};
            //only really doing this to keep track of the ownership
            for (var i = 0; i < state.length - 1; i++)
            {
                var childComponent = state[i];
                var childName = (state[i].name || state[i].properties.DisplayName) || i;
                var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
                childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
                //state[i].id = childID;
                //state2[i].id = childID;
                blankscene.children[childName] = state2[i];
                state[i].id = childID;
                fixIDs(state[i]);
            }
            var props = state[state.length - 1];
            if (props)
            {
                if (!blankscene.properties)
                    blankscene.properties = {};
                for (var i in props)
                {
                    blankscene.properties[i] = props[i];
                }
                for (var i in blankscene.properties)
                {
                    if (blankscene.properties[i] && blankscene.properties[i].value)
                        blankscene.properties[i] = blankscene.properties[i].value;
                    else if (blankscene.properties[i] && (blankscene.properties[i].get || blankscene.properties[i].set))
                        delete blankscene.properties[i];
                }
                //don't allow the clients to persist between a save/load cycle
                blankscene.properties['clients'] = null;
                if (instanceData && instanceData.publishSettings && instanceData.publishSettings.allowTools == false)
                {
                    blankscene.properties['playMode'] = 'play';
                }
                else
                    blankscene.properties['playMode'] = 'stop';
            }
        }
        catch (e)
        {
            err = e;
        }
        if (err)
            cb(null);
        else
            cb(blankscene);
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
                    var state = this.world.cachedState;
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
    this.resyncCounter = 0;
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
                self.resyncCounter++;
                if (self.resyncCounter == 10)
                {
                    self.resyncCounter = 0;
                    var syncClient = self.getLoadClient();
                    var syncmessage = messageCompress.pack(JSON.stringify(
                    {
                        "action": "activeResync",
                        "parameters": [],
                        "time": self.time, //mark so the client will process before any ticks
                        "respond": true,
                        "origin": "reflector",
                    }));
                    if (syncClient)
                        syncClient.emit('message', syncmessage)
                }
            }
            self.lasttime = now;
        }.bind(self);
        self.timerID = setInterval(timer, 5);
        console.warn("timer is " + self.timerID)
    }
    this.setupState = function(state)
    {
        if (!state)
        {
            logger.warn('creating new blank world!');
            state = [
            {
                owner: instancedata.owner
            }];
        }
        var newState = {
            nodes:
            {}
        };
        newState.nodes['index-vwf'] = {
            id: "index-vwf",
            properties: state[state.length - 1],
            children:
            {}
        };
        newState.findNode = function(id, parent)
        {
            var ret = null;
            if (!parent) parent = this.nodes['index-vwf'];
            if (parent.id == id)
                ret = parent;
            else if (parent.children)
            {
                for (var i in parent.children)
                {
                    ret = this.findNode(id, parent.children[i]);
                    if (ret) return ret;
                }
            }
            return ret;
        }
        newState.deleteNode = function(id, parent)
        {
            if (!parent) parent = this.nodes['index-vwf'];
            if (parent.children)
            {
                for (var i in parent.children)
                {
                    if (i == id)
                    {
                        delete parent.children[i];
                        return
                    }
                }
            }
        }
        newState.reattachParents = function(node)
            {
                if (node && node.children)
                {
                    for (var i in node.children)
                    {
                        node.children[i].parent = node;
                        this.reattachParents(node.children[i]);
                    }
                }
            }
            // so, the player has hit pause after hitting play. They are going to reset the entire state with the state backup. 
            //The statebackup travels over the wire (though technically I guess we should have a copy of that data in our state already)
            //when it does, we can receive it here. Because the server is doing some tracking of state, we need to restore the server
            //side state.
        newState.callMethod = function(id, name, args)
        {
            if (id == 'index-vwf' && name == 'restoreState')
            {
                logger.info('Restore State from Play Backup', 2);
                //args[0][0] should be a vwf root node definition
                if (args[0][0])
                {
                    //note we have to JSON parse and stringify here to avoid creating a circular structure that cannot be reserialized 
                    this.nodes['index-vwf'] = JSON.parse(JSON.stringify(args[0][0]));
                    //here, we need to hook back up the .parent property, so we can walk the graph for other operations.
                    this.reattachParents(this.nodes['index-vwf']);
                }
            }
        }
        return newState;
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
        SandboxAPI.getState(this.id, function(state)
        {
            //turn DB state into VWF root node def
            stateToScene(state, self.metadata, function(scene)
            {
                self.state = self.setupState(state);
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "status",
                    "parameters": ["State loaded, sending..."],
                    "time": self.time
                })));
                console.log('got  blank scene');
                //only really doing this to keep track of the ownership
                for (var i = 0; i < state.length - 1; i++)
                {
                    var childID = state[i].id;
                    self.state.nodes['index-vwf'].children[childID] = state[i];
                    self.state.nodes['index-vwf'].children[childID].parent = self.state.nodes['index-vwf'];
                }
                //note: don't have to worry about pending status here, client is first
                self.cachedState = scene;
                socket.emit('message', messageCompress.pack(JSON.stringify(
                {
                    "action": "createNode",
                    "parameters": [scene],
                    "time": self.time
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
            });
        });
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
    this.clientConnected = function(socket)
    {
        this.messagePeerConnected();
        //add the new client to the instance data
        this.addClient(socket);
        //count anonymous users, try to align with the value used for hte displayname of the avatar
        if (socket.loginData.UID == "Anonymous")
        {
            var anonName = this.GetNextAnonName(socket);
            socket.loginData.UID = anonName;
            socket.loginData.Username = anonName;
        }
        socket.pending = true;
        socket.pendingList = [];
        //The client is the first, is can just load the index.vwf, and mark it not pending
        if (this.clientCount() == 1)
        {
            var self = this;
            this.firstConnection(socket, function()
            {
                //this must come after the client is added. Here, there is only one client
                self.messageConnection(socket.id, socket.loginData ? socket.loginData.Username : "", socket.loginData ? socket.loginData.UID : "");
            });
        }
        //this client is not the first, we need to get the state and mark it pending
        else
        {
            this.requestState();
            //loadClient.pending = true;
            socket.emit('message', messageCompress.pack(JSON.stringify(
            {
                "action": "status",
                "parameters": ["Requesting state from clients"],
                "time": this.getStateTime
            })));
            //the below message should now queue for the pending socket, fire off for others
            this.messageConnection(socket.id, socket.loginData ? socket.loginData.Username : "", socket.loginData ? socket.loginData.UID : "");
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
            //Log all message if level is high enough
            if (isPointerEvent(message))
            {
                this.Log(JSON.stringify(message), 4);
            }
            else
            {
                this.Log(JSON.stringify(message), 3);
            }
            //do not accept messages from clients that have not been claimed by a user
            //currently, allow getstate from anonymous clients
            if (!this.allowAnonymous && !sendingclient.loginData && message.action != "getState" && message.member != "latencyTest")
            {
                if (isPointerEvent(message))
                    this.Error('DENIED ' + JSON.stringify(message), 4);
                else
                    this.Error('DENIED ' + JSON.stringify(message), 2);
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
            if (message.action == "setProperty")
            {
                var node = this.state.findNode(message.node);
                if (!node)
                {
                    this.Log('server has no record of ' + message.node, 1);
                    return;
                }
                if (this.allowAnonymous || checkOwner(node, sendingclient.loginData.UID))
                {
                    //We need to keep track internally of the properties
                    //mostly just to check that the user has not messed with the ownership manually
                    if (!node.properties)
                        node.properties = {};
                    node.properties[message.member] = message.parameters[0];
                    this.Log("Set " + message.member + " of " + node.id + " to " + message.parameters[0], 2);
                }
                else
                {
                    this.Error('permission denied for modifying ' + node.id, 1);
                    return;
                }
            }
            //We'll only accept a any of these if the user has ownership of the object
            if (message.action == "createMethod" || message.action == "createProperty" || message.action == "createEvent" ||
                message.action == "deleteMethod" || message.action == "deleteProperty" || message.action == "deleteEvent")
            {
                var node = this.state.findNode(message.node);
                if (!node)
                {
                    this.Error('server has no record of ' + message.node, 1);
                    return;
                }
                if (this.allowAnonymous || checkOwner(node, sendingclient.loginData.UID))
                {
                    this.Log("Do " + message.action + " of " + node.id, 2);
                }
                else
                {
                    this.Error('permission denied for ' + message.action + ' on ' + node.id, 1);
                    return;
                }
            }
            //We'll only accept a deleteNode if the user has ownership of the object
            if (message.action == "deleteNode")
            {
                var node = this.state.findNode(message.node);
                if (!node)
                {
                    this.Error('server has no record of ' + message.node, 1);
                    return;
                }
                if (this.allowAnonymous || checkOwner(node, sendingclient.loginData.UID))
                {
                    //we do need to keep some state data, and note that the node is gone
                    this.state.deleteNode(message.node)
                    this.Log("deleted " + node.id, 2);
                    xapi.sendStatement(sendingclient.loginData.UID, xapi.verbs.derezzed, message.node, node.properties ? node.properties.DisplayName : "", null, this.id);
                }
                else
                {
                    this.Error('permission denied for deleting ' + node.id, 1);
                    return;
                }
            }
            //We'll only accept a createChild if the user has ownership of the object
            //Note that you now must share a scene with a user!!!!
            if (message.action == "createChild")
            {
                this.Log(message, 2);
                var node = this.state.findNode(message.node);
                if (!node)
                {
                    this.Error('server has no record of ' + message.node, 1);
                    return;
                }
                //Keep a record of the new node
                //remove allow for user to create new node on index-vwf. Must have permission!
                var childComponent = JSON.parse(JSON.stringify(message.parameters[0]));
                if (this.allowAnonymous || checkOwner(node, sendingclient.loginData.UID) || childComponent.extends == 'character.vwf')
                {
                    if (!childComponent) return;
                    var childName = message.member;
                    if (!childName) return;
                    var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
                    childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
                    childComponent.id = childID;
                    if (!node.children) node.children = {};
                    node.children[childID] = childComponent;
                    node.children[childID].parent = node;
                    if (!childComponent.properties)
                        childComponent.properties = {};
                    fixIDs(node.children[childID]);
                    this.Log("created " + childID, 2);
                    xapi.sendStatement(sendingclient.loginData.UID, xapi.verbs.rezzed, childID, childComponent.properties.DisplayName, null, this.id);
                }
                else
                {
                    this.Error('permission denied for creating child ' + node.id, 1);
                    return;
                }
            }
            message.instance = this.id;
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
                    this.cachedState = JSON.parse(JSON.stringify(state));
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
                else if (message.action == "activeResync")
                {
                    //here we deal with continual resycn messages
                    var node = message.result.node;
                    if (false && !global.configuration.disableResync && node)
                    {
                        if (message.time >= this.time)
                        {
                            delete node.children; //remove children or we could end up getting large trees
                            this.messageClients(
                            {
                                "action": "resyncNode",
                                "parameters": [node.id, node],
                                "time": this.time, //process before any ticks
                                "origin": "reflector"
                            });
                        }
                        else
                        {
                            logger.info('rejecting resync data from the past');
                            logger.info(message.time, this.time);
                        }
                    }
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
        }
        catch (e)
        {
            //safe to catch and continue here
            logger.error('Error in reflector: onMessage');
            logger.error(e);
            logger.error(e.stack);
        }
    }
    this.disconnect = function(socket)
    {
        logger.info(socket.id);
        logger.info(Object.keys(this.clients));
        this.removeClient(socket);
        logger.info(this.clientCount());
        var self = this
        DAL.getInstance(this.id, function(instancedata)
        {
            if (!instancedata)
            {
                instancedata = {};
                instancedata.title = namespace;
                instancedata.description = '';
            }
            xapi.sendStatement(socket.loginData.UID, xapi.verbs.left, self.id, instancedata.title, instancedata.description, self.id);
        });
        if (this.clientCount() == 0)
        {
            this.shutdown();
        }
        else
        {
            try
            {
                var loginData = socket.loginData;
                logger.debug(socket.id, loginData, 2)
                    //thisInstance.clients[socket.id] = null;
                    //if it's the last client, delete the data and the timer
                    //message to each user the join of the new client. Queue it up for the new guy, since he should not send it until after getstate
                this.messageDisconnection(socket.id, socket.loginData ? socket.loginData.Username : null);
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
exports.stateToScene = stateToScene;