module.exports.title = "Create a box from the menu"
module.exports.test = function(cb)
{
	require("../utils/testutils.js").loadBlank(function()
	{
		var e1 = driver.findElement(By.id('MenuCreate'));
		e1.click();
		driver.sleep(1000);
		var e1 = driver.findElement(By.id('MenuPrimitives'));
		e1.click();
		driver.sleep(1000);
		var e1 = driver.findElement(By.id('MenuCreateBox'));
		e1.click().then(function()
		{
			cb(true);
		});
	});
}