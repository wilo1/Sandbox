module.exports = {
    'Create and delete a world and verify persistence': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		var passed = true;
		var outStr = "";
		var worldId;
		
        browser
			.login(function(err, val){
				if(err){
					outStr += "Unable to log in; ";
					passed = false;
					//Exit test here...
				}
				else outStr += "Login successful; ";
			})
			
			.createWorld(function(err, id){
				if(err){
					passed = false;
					outStr += "Unable to create world; ";
				}
				else{
					worldId = id;
					return browser.url("http://localhost:3000/adl/sandbox/" + id + "?norender=true");
				}
			})
			
			.waitForExist('#preloadGUIBack', 60000)
			.waitForVisible('#preloadGUIBack', 60000, true)
			
			.nextGUID("testWorldPrim")
			.$click("#MenuCreateSphereicon")
			.pause(6000).then(function() {
				testUtils.assertNodeExists("testWorldPrim", function(assertStatus, msg){
					passed = passed && !!assertStatus;
					outStr += "First time: " + msg + "; ";
				});
			})
			
			//Exit world
			.saveDataBeforeUnload()
			.pause(1000)
			
			.url("http://localhost:3000")
			.pause(3000).then(function(){
				browser.url("http://localhost:3000/adl/sandbox/" + worldId + "?norender=true")
			})
			
			.waitForExist('#preloadGUIBack', 60000)
			.waitForVisible('#preloadGUIBack', 60000, true)
			.pause(6000).then(function() {
				testUtils.assertNodeExists("testWorldPrim", function(assertStatus, msg){
					passed = passed && !!assertStatus;
					outStr += "Second time: " + msg + "; ";
				});
			})
			
			.saveDataBeforeUnload()
			.pause(1000).then(function(){
				browser.deleteWorld(worldId, function(err){
					if(err){
						passed = false;
						outStr += "World: " + worldId + " not successfully deleted; ";
					}
					else{
						outStr += "World: " + worldId + " successfully deleted; ";
					}
					
					finished(passed, outStr);
				});
			});			
    }
}
