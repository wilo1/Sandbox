module.exports = {
    'Create and control a T90 Tank': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		var initialLocation;
		
        browser.loadBlankScene()
        .nextGUID('testTank')
        .$click('#EntityLibrarySideTab')
		//#EntityLibraryMain is always visible, so we have to guess a pause time
		.pause(3000)
		.click("#assetDemoEntitiesT90Tank")
		//.dragAndDrop("#assetDemoEntitiesT90Tank", "#index-vwf")
		/*.moveToObject("#assetDemoEntitiesT90Tank", 50, 50)
		.buttonDown()
		.moveToObject("#assetDemoEntitiesT90Tank", 300, 0)
		.buttonUp()*/

        .pause(3000).then(function() {
            testUtils.assertNodeExists("testTank", function(passed, data){
				if(!passed) finished(passed, data);
			});
        })
		.getProperty("testTank", "transform", function(err, value){
			console.log(JSON.stringify(value));
		});
    }
};