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
importScripts("../messageCompress.js")
var socketBytesSentLast = 0;
var socketBytesSent = 0;
var socketBytesReceivedLast = 0;
var socketBytesReceived = 0;
var totalMessagesDecoded = 0;
var totalMessagesEncoded = 0;
var totalEncodeTime = 0;
var totalDecodeTime = 0;

function getUTF8Length(string)
{
	var utf8length = 0;
	for (var n = 0; n < string.length; n++)
	{
		var c = string.charCodeAt(n);
		if (c < 128)
		{
			utf8length++;
		}
		else if ((c > 127) && (c < 2048))
		{
			utf8length = utf8length + 2;
		}
		else
		{
			utf8length = utf8length + 3;
		}
	}
	return utf8length;
}

function log(s)
{
	this.postMessage(
	{
		type: CONSOLE,
		message: s
	});
}

function socketMonitorInterval()
{
	socketBytesSentLast = socketBytesSent;
	socketBytesSent = 0;
	socketBytesReceivedLast = socketBytesReceived;
	socketBytesReceived = 0;
	log(socketBytesSentLast / 10000 + 'KBps up' + socketBytesReceivedLast / 10000 + 'KBps down');
	log("Encode Average Time: " + (totalEncodeTime / totalMessagesEncoded));
	log("Decode Average Time: " + (totalDecodeTime / totalMessagesDecoded));
	log("Message Compression Load: " + ((totalDecodeTime + totalEncodeTime)/10000).toFixed(4) + "%");

	(totalEncodeTime / totalMessagesEncoded)
	if (totalMessagesDecoded + totalMessagesEncoded > 100)
	{
		totalMessagesDecoded = 0;
		totalMessagesEncoded = 0;
		totalEncodeTime = 0;
		totalDecodeTime = 0;
	}
}

function onEvent(event, param)
{
	this.postMessage(
	{
		type: EVENT,
		event:
		{
			name: event,
			param: param
		}
	});
}
onmessage = function(e)
{
	var message = e.data;
	if (message.type == PING)
		postMessage(
		{
			type: PONG
		})
	if (message.type == CONNECT)
	{
		host = message.host;
		options = message.options;
		socket = io(host, options);
		socket.on("message", function(e)
		{
			var message = e;
			socketBytesReceived += 34 + getUTF8Length(message);
			if (message.constructor == String)
			{
				var now = performance.now();
				message = messageCompress.unpack(message);
				totalDecodeTime += performance.now() - now;
				totalMessagesDecoded++
			}
			if(message)
				onEvent("message", message);
		})
		socket.on("connect", function(e)
		{
			setInterval(socketMonitorInterval, 10000);
			postMessage(
			{
				type: ID,
				id: this.id
			})
			onEvent("connect", e);
		})
		socket.on("disconnect", function(e)
		{
			onEvent("disconnect", e);
		})
		socket.on("error", function(e)
		{
			onEvent("error", e);
		})
		socket.connect();
	}
	if (message.type == SEND)
	{
		// Send the message.
		if (message.message.constructor !== String)
		{
			var now = performance.now();
			message.message = messageCompress.pack(message.message);
			totalEncodeTime += performance.now() - now;
			totalMessagesEncoded++
		}
		socketBytesSent += 34 + getUTF8Length(message.message);
		socket.send(message.message)
	}
}