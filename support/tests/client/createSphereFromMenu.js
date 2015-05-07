module.exports.title = "Create a sphere from the menu"
module.exports.test = function(cb)
{
	require("../utils/testutils.js").loadBlank(function()
	{
		require("../utils/testutils.js").nextGUID("testSphere");
		var e1 = driver.findElement(By.id('MenuCreate'));
		e1.click();
		driver.sleep(300);
		var e1 = driver.findElement(By.id('MenuPrimitives'));
		e1.click();
		driver.sleep(300);
		var e1 = driver.findElement(By.id('MenuCreateSphere'));
		e1.click().then(function()
		{
			require("../utils/testutils.js").waitForNode("sphere2-vwf-testSphere",500, function(node)
			{
				if(node)
				{
					console.log(node);
					cb(true,JSON.stringify(node.name));
				}
				else
					cb(false,"timeout waiting on node creation");		
			});
		});
	});
}