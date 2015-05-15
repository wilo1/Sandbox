module.exports = {
    'Load Arcade Game Console from 3DR': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		
        browser.loadBlankScene()
			.nextGUID("testArcade")
			.click("#MenuModelsicon")
			.pause(2000)
			.setValue("#ModelSearchTerm", "arcade")
			.click("#ModelSearchButton")
			.waitForExist("#Thumb0", 30000)
			.click("#Title0")
			.pause(2000)
			//This should result in the create button
			.click("#ModelDetails + .ui-dialog-buttonpane .ui-dialog-buttonset :nth-child(2)")
			.pause(6000).then(function() {
				testUtils.assertNodeExists("testArcade", finished);
			});
    }
}
