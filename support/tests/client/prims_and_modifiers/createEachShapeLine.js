//Create each Line (D3)
//Shapes: Line, Circle, Star, Rectangle, L-section, T-section
module.exports = {
	'Create each line (D3)': function(browser, finished) {
		global.browser = browser;
		var testUtils = require('../../utils/testUtils.js'),
			passed = true,
			outStr = "";
			
		browser.loadBlankScene()
		
		//Create Line from shapes menu
		.nextGUID('testLine')
		.click('#MenuCreate')
		.waitForVisible('#MenuShapes')
		.click('#MenuShapes')
		.waitForVisible('#MenuCreateLine')
		.click('#MenuCreateLine')
		
		//Verify Line
		.pause(3000).then(function() {
			testUtils.assertNodeExists("testLine", function(assertStatus, msg) {
				passed = passed && !!assertStatus;
				outStr += "Line exists: " + msg + "; ";
				finished(passed, outStr);
			});
		});
	}
}