var globalBase = "http://localhost:3000/adl/sandbox/";
var outArr = [];
module.exports = function(){ return outArr; };

var tests = [
	{ title: "Test import of unoptimized Collada file", model: "usmale.dae"},
	{ title: "Test import of optimized Collada file", model: "usmale.dae"},
	{ title: "Test import of 3DR JSON file", model: "house2.json", base: globalBase + "examples/3drjson/"},
	{ title: "Test import of glTF JSON file", model: "monster.json", base: globalBase + "examples/gltfAsset/"}
];
		
for(var i = 0; i < tests.length; i++){
	outArr.push({
		title: tests[i].title, 
		test: 
			function(i){
				return function(browser, finished){
					runAssetTest(browser, finished, tests[i]);
				}
			}(i)
	});
}

function runAssetTest(browser, finished, test){
	global.browser = browser;
	var testUtils = global.testUtils;
	var outStr = "";
	var passed = true;
	var i = tests.indexOf(test);
	
	browser.loadBlankScene();

	//do not run nonexistent test when loading glTF JSON (tests[3])
	if(i != 3){
		loadModel("this_shouldnt_exist", test.base)
			.pause(1000)
			.hasViewNode("this_shouldnt_exist", function(err, exists){
				passed = passed && !exists;
				outStr += "Nonexistent model: " + exists + ", expected: false; ";
			})
			.getText("#alertify .alertify-message", function(err, msg){
				var success = msg.toLowerCase().indexOf("error") > -1;
				passed = passed && success;
				outStr += "Error message: "+success+", expected: true; ";
			})
			.click("#alertify-ok");
	}
		
	loadModel(test.model, test.base)		
		.pause(6000).then(function() {
			testUtils.assertNodeExists(test.model, function(assertStatus, msg){
				passed = passed && !!assertStatus;
				outStr += msg + "; ";
			});
		})
		.hasViewNode(test.model, function(err, exists){
			passed = passed && exists;
			outStr += test.model + ": " + exists + ", expected: true; ";
			console.log('test finished');
			finished(passed, outStr);
		});
		
	function loadModel(modelName, base){
		return browser.nextGUID(modelName)
			.click("#MenuCreate")
			.pause(500)
			
			.click("#MenuCreateLoadMeshURL")
			
			.waitForExist("#choice" + i, 2000)
			.click("#choice" + i)
			
			.pause(1000)
			.waitForExist("#alertify-ok", 2000)
			.click("#alertify-ok")
			
			.waitForExist("#alertify-text", 2000)
			.setValue("#alertify-text", base ? base + modelName : globalBase + modelName)
			.click("#alertify-ok");
	}
}

