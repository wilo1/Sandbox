function testcreateprim(createButton, nodeID, assert)
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
		var e1 = driver.findElement(By.id(createButton));
		e1.click().then(function()
		{
			require("../utils/testutils.js").assertNodeExists(nodeID, assert);
		});
	});
}
module.exports = function()
{
	var menuitems = ['MenuCreateBox', 'MenuCreateSphere', 'MenuCreateCone', 'MenuCreatePlane', 'MenuCreateCylinder'];
	var idprefix = ['box2-vwf-', 'sphere2-vwf-', 'cone2-vwf-', 'plane2-vwf-', 'cylinder2-vwf-'];
	var tests = [];
	for (var i in menuitems)
	{
		(function test()
		{
			var name = menuitems[i];
			var id = idprefix[i] + 'testSphere';
			tests.push(
			{
				title: "Create prim from menu " + menuitems[i],
				test: function(assert)
				{
					testcreateprim(name, id, assert);
				}
			})
		})()
	}
	return tests;
}