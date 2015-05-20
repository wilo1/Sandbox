var models = ["usmale.dae"];
var base = "http://localhost:3000/adl/sandbox/";
var tests = ['Test import of unoptimized Collada file', "Test import of optimized Collada file"];
var outArr = [];

module.exports = function(){
	return outArr;
};
		
for(var i = 0; i < tests.length; i++){
	outArr.push({
		title: tests[i], 
		test: 
			function(i){
				return function(browser, finished){
					runAssetTest(browser, finished, i);
				}
			}(i)
	});
}

function runAssetTest(browser, finished, i){
	global.browser = browser;
	var testUtils = global.testUtils;
	var outStr = "";
	var passed = true;
	
	browser.loadBlankScene()
		.nextGUID(models[0])
		.click("#MenuCreate")
		.pause(2000)
		
		.click("#MenuCreateLoadMeshURL")
		
		.waitForExist("#choice" + i, 3000)
		.click("#choice" + i)
		
		.pause(2000)
		.waitForExist("#alertify-ok", 3000)
		.click("#alertify-ok")
		
		.waitForExist("#alertify-text", 3000)
		.setValue("#alertify-text", base + models[0])
		
		.pause(2000)
		.click("#alertify-ok")
		
		//This should result in the create button
		.pause(6000).then(function() {
			/*testUtils.assertNodeExists(models[0], function(assertStatus, msg){
				passed = passed && !!assertStatus;
				outStr += msg + "; ";
			});*/
		})
		.getViewNode(models[0], function(err, viewNode){
			
			outStr += "View node: " + viewNode + "; " + err;
			finished(passed, outStr);
		});
}

