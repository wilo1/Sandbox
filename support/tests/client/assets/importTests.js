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
	
	browser.loadBlankScene();

	loadModel("this_shouldnt_exist.dae")
		.pause(1000)
		.hasViewNode("this_shouldnt_exist.dae", function(err, exists){
			passed = passed && !exists;
			outStr += "Nonexistent model: " + exists + ", expected: false; ";
		})
		.getText("#alertify .alertify-message", function(err, msg){
			var success = msg.toLowerCase().indexOf("error") > -1;
			passed = passed && success;
			outStr += "Error message: "+success+", expected: true; ";
		})
		.click("#alertify-ok");
		
	loadModel(models[0])		
		.pause(6000).then(function() {
			testUtils.assertNodeExists(models[0], function(assertStatus, msg){
				passed = passed && !!assertStatus;
				outStr += msg + "; ";
			});
		})
		.hasViewNode(models[0], function(err, exists){
			
			passed = passed && exists;
			outStr += models[0] + ": " + exists + ", expected: true; ";
			finished(passed, outStr);
		});
		
	function loadModel(model){
		return browser.nextGUID(model)
			.click("#MenuCreate")
			.pause(1000)
			
			.click("#MenuCreateLoadMeshURL")
			
			.waitForExist("#choice" + i, 2000)
			.click("#choice" + i)
			
			.pause(500)
			.waitForExist("#alertify-ok", 2000)
			.click("#alertify-ok")
			
			.waitForExist("#alertify-text", 2000)
			.setValue("#alertify-text", base + model)
			
			.pause(500)
			.click("#alertify-ok");
	}
}

