var async = require("async");
module.exports.hookupUtils = function(browser) {
    console.log('hook up utils');

    browser.addCommand("loadBlankScene", function(cb) {
        module.exports.loadBlankScene(cb)
    });
    browser.addCommand("nextGUID", function(GUID,cb) {
        browser.execute(function(id) {
            window.GUID.nextGUID = id;
        }, GUID,function(err,r){
        	cb()
        })
    });
    browser.addCommand("createNode", function(nodeDef) {
        var cb = arguments[arguments.length -1]
        browser.execute(function(node) {

            var name = GUID();
            vwf_view.kernel.createChild(vwf.application(), name, node);
            return name;
        }, nodeDef, function(err, nodename) {
            console.log('wait for node ' + nodename.value)
            module.exports.waitForNode(nodename.value, 10000, function(node) {
                if (!node)
                    throw (new Error('Node not created'))
                cb(null,nodename.value);
            })
        })
    });
    browser.addCommand("getNode", function(nodename, cb) {
        
        //var cb = arguments[arguments.length -1]
        module.exports.waitForNode(nodename, 10000, function(node) {
            if (!node)
                throw (new Error('Node not created'))
            cb(null,node);
        })
    });
    browser.addCommand("getProperty", function(newnodename, propname) {
        
        var cb = arguments[arguments.length -1]
        browser.execute(function(a,b) {
            var id = vwf.find(vwf.application(), a)[0];
        	return vwf.getProperty("" + id,b);
        }, newnodename,propname,function(err, r)
        {
        	
        	cb(null,r)
        });
    });

    browser.addCommand("setProperty", function(newnodename, propname, value) {
        
        var cb = arguments[arguments.length -1]
        browser.execute(function(a,b,c) {
            var id = vwf.find(vwf.application(), a)[0];
        	return vwf_view.kernel.setProperty("" + id,b,c);
        }, newnodename,propname,value,function(err, r)
        {
        	cb(null,r.value)
        });
    });
    browser.addCommand("deleteNode", function(newnodename) {
        
        var cb = arguments[arguments.length -1]
        browser.execute(function(a) {
            var id = vwf.find(vwf.application(), a)[0];
        	return vwf_view.kernel.deleteChild(vwf.application(),"" + id);
        }, newnodename,function(err, r)
        {
        	cb(null,r.value)
        });
    });

}

module.exports.loadBlankScene = function(cb) {
    browser
        .url('http://localhost:3000/adl/sandbox/example_blank/')
        .waitForExist('#preloadGUIBack', 10000)
        .waitForVisible('#preloadGUIBack', 10000, true)
        .pause(3000).then(cb);


}
module.exports.nextGUID = function(GUID) {
    browser.execute(function(id) {
        window.GUID.nextGUID = id;
    }, GUID);
}
module.exports.waitForNode = function(name, timeout, done) {
    timeout = timeout || 500;
    var t0 = Date.now();
    var result
    
    function loop() {
        if (!result && Date.now() - t0 < timeout) {
            browser.execute(getNode, name, function(err, r) {
                result = r && r.value;
            });
            global.setTimeout(loop, 500);
        }
		else{
			done(result);
		}
    };

    global.setTimeout(loop, 500);
}

function getNode(name) {
    try {
        //adding "" is just to ensure that id is a String
        var id = vwf.find(vwf.application(), name)[0];
        return vwf.getNode("" + id,true);
    } catch (e) {
        return null;
    }
}

module.exports.assertNodeExists = function(name, assert) {
    this.waitForNode(name, 6500, function(node) {
        console.log(JSON.stringify(node))
        if (node) {
            assert(true, JSON.stringify(node.id));
        } else
            assert(false, "timeout waiting on node creation");
    });
}