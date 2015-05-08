module.exports = {
	'Demo test Sandbox': function(browser, finished)
	{
		global.browser = browser;
		var testUtils = require('../utils/testutils.js');
		testUtils.loadBlank(function()
		{
			testUtils.nextGUID('testSphere');
			browser
				.click('#MenuCreate')
				//gets the ul that is the sibling of #MenuCreate
				.waitForVisible('#MenuPrimitives', 1000)
				.click('#MenuPrimitives')
				.waitForVisible('#MenuCreateSphere', 1000)
				.click('#MenuCreateSphere')
				.pause(3000).then(function()
				{
					testUtils.assertNodeExists("testSphere2", finished)
				})
		});
	}
};