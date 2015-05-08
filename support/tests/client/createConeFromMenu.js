module.exports = {
	'Demo test Sandbox': function(browser, finished)
	{
		global.browser = browser;
		var testUtils = require('../utils/testutils.js');
		testUtils.loadBlank(function()
		{
			testUtils.nextGUID('testCone');
			browser
				.click('#MenuCreate')
				//gets the ul that is the sibling of #MenuCreate
				.waitForVisible('#MenuPrimitives', 1000)
				.click('#MenuPrimitives')
				.waitForVisible('#MenuCreateCone', 1000)
				.click('#MenuCreateBox')
				.pause(3000).then(function()
				{
					testUtils.assertNodeExists("testCone", finished)
				})
		});
	}
};