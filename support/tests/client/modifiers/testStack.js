module.exports = {
    'Tests creating multiple modifiers': function(browser, finished) {
        global.browser = browser;
        var testUtils = global.testUtils;
		var passed = true;
		var outStr = "";
		var worldId;
		
		var nodeName = "testWorldPrim";
		var modifiers = [{name: "Bend", vwf: ""}, {name: "Twist", vwf: ""}];
		
        browser
			.loadBlankScene()
			
			.waitForExist('#preloadGUIBack', 60000)
			.waitForVisible('#preloadGUIBack', 60000, true)
			
			.nextGUID(nodeName)
			.$click("#MenuCreateSphereicon")
			.pause(6000).then(function() {
				testUtils.assertNodeExists(nodeName, function(assertStatus, msg){
					passed = passed && !!assertStatus;
					outStr += msg + " exists; ";
				});
			})
			
			//Create the modifier
			.pause(1000)
			.then(function(){
				return addModifier(modifiers[0].name);
			})			
			.pause(2000)
			.then(function(){
				return addModifier(modifiers[1].name);
			})
			.pause(1000)
			//Ensure the first modifier exists..
			.getChildren(nodeName, function(err, children){
				var i = 0;
				if(children && children[0] && children[0].indexOf(modifiers[i].name.toLowerCase()) > -1){
					
					modifiers[i].vwf = children[0];
					outStr += modifiers[i].name + " (" + children[0] + ") modifier found; ";
				}
				else{
					passed = false;
					outStr += modifiers[i].name + " modifier NOT found; ";
				}
			})
			.pause(500)
			.then(function(){
				//Ensure that the second modifier is a child of the first modifier
				//This is kind of ugly. It's necessary because nextGUID doesn't work correctly with modifiers
				return browser.execute(
					function(id){
						return vwf.children(id);
					}, 
					modifiers[0].vwf, 
					function(err, children){
						var i = 1;
						children = children.value;
						if(children && children[0] && children[0].indexOf(modifiers[i].name.toLowerCase()) > -1){
							
							modifiers[i].vwf = children[0];
							outStr += modifiers[i].name + " (" + children[0] + ") modifier found; ";
						}
						else{
							passed = false;
							outStr += modifiers[i].name + " modifier NOT found; ";
						}
						
						finished(passed, outStr);
					});
			});
			
		function addModifier(modifier){
			return browser
				.nextGUID(modifier)
				.$click("#MenuCreate")
				.pause(500)
				.$click("#MenuModifiers")
				.pause(500)
				.$click("#MenuCreate" + modifier)
				.pause(500)
		}
    }
}
