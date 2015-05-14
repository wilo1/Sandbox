module.exports = {
    'Tests creating and deleting world and verifying persistence': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		var passed = true;
		var outStr = "";
		var worldId;
		
        browser
			.login(function(err, val){
				if(err){
					outStr += "Unable to log in";
					passed = false;
					//Exit test here...
				}
				else outStr += "Login successful";
			})
			
			//Create world
			.url("http://localhost:3000/adl/sandbox/createNew2/noTemplate")
			.waitForExist("#txtInstanceName", 5000)
			.setValue("#txtInstanceName", "worldMultistep.Test.Title")
			.click('input[type="submit"]').pause(1000)
			
			//Once created, get world id
			.waitForExist("#content", 5000)
			.url(function(err, url){
				var tempArr = url.value.split('/');
				worldId = tempArr[tempArr.length-1];
				
				//navigate to newly created world using id
				browser.url("http://localhost:3000/adl/sandbox/" + worldId)
			})
			
			.waitForExist('#preloadGUIBack', 60000)
			.waitForVisible('#preloadGUIBack', 60000, true)
			.pause(3000)
			
			.nextGUID("testWorldPrim")
			.click("#MenuCreateSphereicon")
			.pause(6000).then(function() {
				testUtils.assertNodeExists("testWorldPrim", function(assertStatus, msg){
					passed = passed && assertStatus;
					outStr += msg;
				});
			})
			
			//Exit world
			.url("http://localhost:3000")
			.pause(3000).then(function(){
				browser.url("http://localhost:3000/adl/sandbox/" + worldId)
			})
			
			.waitForExist('#preloadGUIBack', 60000)
			.waitForVisible('#preloadGUIBack', 60000, true)
			.pause(3000).then(function() {
				testUtils.assertNodeExists("testWorldPrim", function(assertStatus, msg){
					passed = passed && assertStatus;
					outStr += msg;
					finished(passed, outStr);
				});
			});
    }
}
