var async = require("async");
module.exports.loadBlank = function(cb)
{
	driver.get("http://localhost:3000/adl/sandbox/example_blank/");
	driver.wait(webdriver.until.elementLocated(webdriver.By.id('preloadGUIBack')), 10000);
	driver.wait(webdriver.until.elementIsNotVisible(driver.findElement(webdriver.By.id('preloadGUIBack'))), 10000);
	driver.sleep(3000);
	cb();
}
module.exports.nextGUID = function(GUID)
{
	driver.executeScript("GUID.nextGUID = '" + GUID +"';")
}

module.exports.waitForNode = function(ID,timeout,done)
{
	timeout = timeout || 500;
	timeout = timeout / 100;
	var counter = 0;
	var node = null;
	var result = null;
	async.until(function()
	{
		counter ++
		node = driver.executeScript("try{return vwf.getNode('"+ID+"')}catch(e){return null}");
		return counter > timeout || result !== null;
			
	},function(cb){
		node.then(function(returnval)
		{
			result	= returnval;
			global.setTimeout(cb,100)
			
		})
	},function()
	{
	     done(result);
	})
}