var globalBase = "http://localhost:3000/adl/sandbox/";
var outArr = [];
module.exports = function(){ return outArr; };

var modifiers = ["Bend", "Twist", "Taper", "PerlinNoise", "SimplexNoise", "Offset", "Stretch", "Push", "UVMap", "CenterPivot", "Extrude", "PathExtrude", "Lathe"];
		
for(var i = 0; i < modifiers.length; i++){
	outArr.push({
		title: "Test " + modifiers[i] + " modifier", 
		test: 
			function(i){
				return function(browser, finished){
					runAssetTest(browser, finished, modifiers[i]);
				}
			}(i)
	});
}

function runAssetTest(browser, finished, test){
	global.browser = browser;
	var testUtils = global.testUtils;
	var outStr = "";
	var passed = true;
	var i = modifiers.indexOf(test);
	
	var tmpArr = [];
	
	browser.loadBlankScene();
		
	loadModel(test)	
		.pause(6000).then(function() {
			testUtils.assertNodeExists(test, function(assertStatus, msg){
				passed = passed && !!assertStatus;
				outStr += msg + "; ";
			});
		})
		.pause(2000);
		
	addModifier(i)		
		.getConsoleLog(testUtils.SEVERE, function(err, arr){
			outStr += "Log error: " + JSON.stringify(err) + ", Log message: " + JSON.stringify(arr) + " ";
		})
		.pause(5000)
		.getChildren(test, function(err, children){
			if(children[0] && children[0].indexOf(modifiers[i].toLowerCase()) > -1){
				outStr += modifiers[i] + " modifier found; ";
			}
			else{
				passed = true;
				outStr += modifiers[i] + " modifier NOT found; ";
			}
			
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

