module.exports = {
    'Create and control a T90 Tank3': function(browser, finished) {
        global.browser = browser;

        var testUtils = global.testUtils;
        var initialLocation;

        browser.loadBlankScene()
            .nextGUID('testTank')
            .$click('#EntityLibrarySideTab')

        .pause(1000) //#EntityLibraryMain is always visible, so we have to guess a pause time
        .click("#assetDemoEntitiesT90Tank")
            .pause(3000)
        //.dragAndDrop("#assetDemoEntitiesT90Tank", "#index-vwf")
        /*.moveToObject("#assetDemoEntitiesT90Tank", 50, 50)
		.buttonDown()
		.moveToObject("#assetDemoEntitiesT90Tank", 300, 0)
		.buttonUp()*/
        .pause(3000)
            .getNode("testTank", function(err, data) {
                if (!data)
                    finished(false, data);
                else {
                    browser.getProperty("testTank", "transform", function(err, value) {
                        initialLocation = value.value;
                    }).click("#playButton")
                        .pause(1000)
                        .getProperty("testTank", "transform", function(err, value) {
                            var deltaX = value.value[12] - initialLocation[12];
                            var deltaY = value.value[13] - initialLocation[13];
                            var deltaZ = value.value[14] - initialLocation[14];
                            if (!deltaX && !deltaY && !deltaZ)
                                finished(false, [deltaX, deltaY, deltaZ])
                            else
                                finished(true, [deltaX, deltaY, deltaZ])
                        });
                }
            });
    }
}