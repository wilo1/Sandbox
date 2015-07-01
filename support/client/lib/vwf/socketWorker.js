var EVENT = 0;
var SEND = 1;
var DISCONNECT = 2;
var CONNECT = 3;
var PING = 4;
var PONG = 5;
var CONSOLE = 6;
var ID = 7;

var host = null;
var options = null;

importScripts("/socket.io/socket.io.js")
var socket;
function onEvent(event,param)
{
	this.postMessage({type:EVENT,event:{name:event,param:param}});
}
onmessage = function(e)
{

	var message = e.data;
	if(message.type == PING)
		postMessage({type:PONG})
	if(message.type == CONNECT)
	{

		host = message.host;
		options = message.options;
		socket = io(host,options);
		socket.on("message",function(e)
		{
			onEvent("message",e);
		})
		socket.on("connect",function(e)
		{
			postMessage({type:ID,id:this.id})
			onEvent("connect",e);
		})
		socket.on("disconnect",function(e)
		{
			onEvent("disconnect",e);
		})
		socket.on("error",function(e)
		{
			onEvent("error",e);
		})
		socket.connect();
	}
	if(message.type == SEND)
	{
		socket.send(message.message)
	}

}