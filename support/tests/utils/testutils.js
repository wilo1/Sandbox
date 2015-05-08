var async = require("async");
module.exports.loadBlank = function(cb)
{
	browser
		.url('http://localhost:3000/adl/sandbox/example_blank/?norender=true')
		.waitForExist('#preloadGUIBack', 10000)
		.waitForVisible('#preloadGUIBack', 10000,true)
		.pause(3000);
		
	cb();
}
module.exports.nextGUID = function(GUID)
{
	browser.execute(function(id){
		window.GUID.nextGUID = id;
	}, [GUID]);
}
module.exports.waitForNode = function(name, timeout, done)
{
	timeout = timeout || 500;
	var t0 = Date.now();
	var result 
	
	function loop(){
		if(!result && Date.now() - t0 < timeout){
			browser.execute(getNode, name,function(err,r)
			{
				result = r.value;
			});
			global.setTimeout(loop, 100);
		}
		else{

			done(result);
		}
	};
		
	global.setTimeout(loop, 100);
}

function getNode(name){
	try{
		//adding "" is just to ensure that id is a String
		var id = vwf.find(vwf.application(),name)[0]
		return vwf.getNode("" + id);
	}
	catch(e){
		return null;
	}
}

module.exports.assertNodeExists = function(name, assert)
{
	this.waitForNode(name, 6500, function(node)
	{
		console.log(JSON.stringify(node))
		if (node)
		{
			assert(true, JSON.stringify(node.id));
		}
		else
			assert(false, "timeout waiting on node creation");
	});
}