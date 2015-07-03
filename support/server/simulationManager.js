var messageCompress = require('../client/lib/messageCompress')
    .messageCompress;
var simClient = function(sandboxClient, simulationManager)
{
    this.manager = simulationManager;
    this.sandboxClient = sandboxClient;
    this.nodesSimulating = [];
    this.startSimulatingScene = function()
    {
        var nodes = this.manager.world.state.children('index-vwf')
        for (var i =0; i < nodes.length; i++)
        {
            if (this.nodesSimulating.indexOf(nodes[i]) == -1)
                this.nodesSimulating.push(nodes[i])
        }
        this.sendStartSimMessage('index-vwf');
    }
    this.startSimulatingNode = function(nodeID)
    {
        if (this.manager.world.state.findNode(nodeID))
            if (this.nodesSimulating.indexOf(nodeID) == -1)
                this.nodesSimulating.push(nodeID)

        this.sendStartSimMessage(nodeID);
    }
    this.isSimulating = function(nodeid)
    {
    	return this.nodesSimulating.indexOf(nodeid) !== -1;
    }
    this.stopSimulatingNode = function(nodeID)
    {
        if (this.manager.world.state.findNode(nodeID))
            if (this.nodesSimulating.indexOf(nodeID) != -1)
                this.nodesSimulating.splice(this.nodesSimulating.indexOf(nodeID), 1)

        this.sendStopSimMessage(nodeID);
    }
    this.sendStopSimMessage = function(nodeID)
    {
        this.sandboxClient.emit('message', messageCompress.pack(JSON.stringify(
        {
            "action": "stopSimulating",
            "parameters": [nodeID],
            "time": this.manager.world.time
        })));
    }
    this.sendStartSimMessage = function(nodeID)
    {
        this.sandboxClient.emit('message', messageCompress.pack(JSON.stringify(
        {
            "action": "startSimulating",
            "parameters": [nodeID],
            "time": this.manager.world.time
        })));
    }
}
var simulationManager = function(world)
{
    this.world = world;
    this.clients = {};
    this.addClient = function(sandboxClient)
    {
        
        var newClient = new simClient(sandboxClient,this);
        //must add to list to get proper average load, then remove so we don't keep distributing
        //nodes from new client to new client
        this.clients[sandboxClient.id] = newClient;
        var average = this.clientAverageLoad();
        delete this.clients[sandboxClient.id];

        var counter = 0;
        //divide up work distribute until new client shares load
        while (newClient.nodesSimulating.length < average )
        {
            var nextClient = this.clients[Object.keys(this.clients)[counter]];
            var node = nextClient.nodesSimulating[0];
            if (node)
            {
                nextClient.stopSimulatingNode(node);
                newClient.startSimulatingNode(node);
            }
            counter++;
            counter = counter % this.clientCount();
        }
        this.clients[sandboxClient.id] = newClient;
    }
    this.clientCount = function()
    {
        return (Object.keys(this.clients).length);
    }
    this.removeClient = function(sandboxClient)
    {
        var oldNodes = this.clients[sandboxClient.id].nodesSimulating;
        delete this.clients[sandboxClient.id];
        //redistribute the nodes the client had been simulating
        this.distribute(oldNodes);
    }
    this.distribute = function(nodes)
    {
        while (nodes.length)
        {
            for (var i in this.clients)
            {
                var node = nodes.shift();
                if (node)
                    this.clients[i].startSimulatingNode(node);
            }
        }
    }
    this.getClientForNode = function(nodeID)
    {
        for (var i in this.clients)
            if (this.clients[i].isSimulating(nodeID))
                return this.clients[i];
        return null;
    }
    this.clientAverageLoad = function()
    {
        var total = 0
        for (var i in this.clients)
            total += this.clients[i].nodesSimulating.length;
        return total / this.clientCount();
    }
    this.startScene = function()
    {
        this.clients[Object.keys(this.clients)[0]].startSimulatingScene();
    }
    this.nodeCreated = function(nodeid, creatingClient)
    {
        this.clients[creatingClient.id].startSimulatingNode(nodeid);
    }
    this.nodeDeleted = function(nodeid)
    {
        this.getClientForNode(nodeid).stopSimulatingNode(nodeid);
    }
}

exports.simulationManager = simulationManager;