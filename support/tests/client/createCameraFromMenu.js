module.exports.title = "Create a camera from the menu"
module.exports.test = function(assert)
{
	require("../utils/testutils.js").loadBlank(function()
	{
		require("../utils/testutils.js").nextGUID("testSphere");
		var e1 = driver.findElement(By.id('MenuCreate'));
		e1.click();
		driver.sleep(300);
		var e1 = driver.findElement(By.id('MenuCameras'));
		e1.click();
		driver.sleep(300);
		var e1 = driver.findElement(By.id('MenuCreateCameraPerspective'));
		e1.click().then(function()
		{
			require("../utils/testutils.js").assertNodeExists("SandboxCamera-vwf-testSphere",assert);
		});
	});
}