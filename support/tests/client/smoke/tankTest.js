module.exports = {
    'Create and control a T90 Tank': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		var outStr = "";
		var passed = true;
		var oldPos;
		
        browser.loadBlankScene()
        .nextGUID('testTank')
        .$click('#EntityLibrarySideTab')
		.pause(2000)
		.click("#assetDemoEntitiesT90Tank")
        .pause(6000).then(function() {
            testUtils.assertNodeExists("testTank", function(assertStatus, data){
				passed = passed && !!assertStatus;
				outStr += data;
			});
        })
		.getProperty("testTank", "transform", function(err, prop){
			oldPos = prop.value.slice(12, 15);
		})
		.click("#playButton")
		.pause(2000)
		.$keydown("W", "canvas")
		.pause(5000)
		.getProperty("testTank", "transform", function(err, prop){
			var distance = testUtils.getDistance(oldPos, prop.value.slice(12, 15));
			if(distance <= 10){
				passed = false;
				outStr += "; Distance traveled: " + distance + " <= 10; ";
			}
			else outStr += "; Distance traveled: " + distance + " > 10; ";
		})
		.pause(500, function(err, data){
			finished(passed, outStr);
		});
    }
};