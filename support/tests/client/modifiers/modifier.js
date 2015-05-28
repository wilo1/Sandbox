var globalBase = "http://localhost:3000/adl/sandbox/";
var outArr = [];
module.exports = function(){ return outArr; };

var modifiers = ["Bend", "Twist", "Taper", "PerlinNoise", "SimplexNoise", "Offset", "Stretch", "Push", "UVMap", "CenterPivot", "Extrude", "PathExtrude", "Lathe"];

var tests = [
	{ title: "Test modifier on prim", model: "firstPrim"},
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
	
	var tmpArr = [];
	
	browser.loadBlankScene();
		
	loadModel(test.model)	
		.pause(6000).then(function() {
			testUtils.assertNodeExists(test.model, function(assertStatus, msg){
				passed = passed && !!assertStatus;
				outStr += msg + "; ";
			});
		})
		.pause(2000);
		
	addModifier(i)		
		.getConsoleLog(testUtils.SEVERE, function(err, arr){
			outStr += "Log error: " + JSON.stringify(err) + ", Log message: " + JSON.stringify(arr) + " ";
		})
		.pause(30000).then(function(){
			finished(passed, outStr);
		});
		
	function addModifier(i){
		return browser.click("#MenuCreate")
			.pause(500)
			.click("#MenuModifiers")
			.pause(500)
			.click("#MenuCreate" + modifiers[i])
			.pause(500);
	}
		
	function loadModel(modelName){
		return browser.nextGUID(modelName)
			.click("#MenuCreateCylindericon")
			.pause(500);
	}
}

