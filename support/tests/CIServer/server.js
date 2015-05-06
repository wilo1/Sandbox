var async = require("async")
var http = require("http");
var path = require("path");
var childprocess = require("child_process");
var fs = require('fs');
var stdoutLog = "";
var stderrLog = "";
var report = {};
var cancel = false;
var RUNNING = 1;
var COMPLETE = 0;
var CANCELING = 2;
var NOTSTARTED = 3;
var status = NOTSTARTED;

function updateAndRunTests(cb2)
{
	//bail if already running. This really should never happen
	if (status == RUNNING)
	{
		cb2();
		return;
	}
	status = RUNNING;
	stdoutLog = "";
	stderrLog = "";
	var sandbox = null;
	global.webdriver = require('selenium-webdriver');
	global.driver = new webdriver.Builder().
	withCapabilities(webdriver.Capabilities.chrome()).
	build();
	report = {};
	report.gitLog = "";
	async.series([
			//do a get pull and update the dev branch
			function gitPull(cb)
			{
				console.log("Git Pull");
				var gitpull = childprocess.spawn("git", ["pull"],
				{
					cwd: "../../../",
					//stdio:'inherit' 
				});
				//log errors
				gitpull.stdout.on('data', function(data)
				{
					report.gitLog += data.toString();
				});
				gitpull.stderr.on('data', function(data)
				{
					report.gitLog += data.toString();
				});
				//wait for process to complete
				gitpull.on('close', function(code)
				{
					if (code !== 0)
					{
						console.log('ps process exited with code ' + code);
					}
					cb();
				});
			},
			function startSandbox(cb)
			{
				console.log("Sandbox start");
				//start the sandbox server
				sandbox = childprocess.spawn("node", ["app.js"],
				{
					cwd: "../../../"
				});
				sandbox.stdout.on('data', function(data)
				{
					//Wait for startup complete
					if (data.toString().indexOf("Startup complete") > -1)
						cb();
				})
			},
			//run the selenium tests
			function findAndRunTests(cb)
			{
				console.log("findAndRunTests")
				report.tests = {};
				var files = [];
				var tests = [];
				async.series([
					function findFiles(nextStep)
					{
						console.log("findFiles")
						fs.readdir("../client/",
							function(err, foundfiles)
							{
								files = foundfiles;
								nextStep();
							});
					},
					function readFiles(nextStep)
					{
						console.log("readFiles")
							//for each file
						async.eachSeries(files, function(filename, nextfile)
						{
							console.log(filename)
								//bail out of all tests if canceling
							if (status == CANCELING)
							{
								console.log("canceling run")
								nextfile(true);
								return;
							}
							//each test can be a function that returns an array of tests, or a single test
							delete require.cache["../client/" + filename] // remove so the results are not cached, and the above git pull can update tests
							var test = require("../client/" + filename);
							if (test instanceof Function)
								tests = tests.concat(test())
							else tests.push(test);
							test.filename = filename;
							var id = test.filename + ":" + test.title;
							report.tests[id] = {
								status: "not started",
								result: null,
								message: null,
								title: test.title,
								filename: test.filename
							}
							nextfile();
						}, nextStep);
					},
					function runTests(nextStep)
					{
						//for each test in this file
						async.eachSeries(tests, function(thistest, nextTest)
						{
							//bail out of all tests if canceling
							if (status == CANCELING)
							{
								console.log("canceling run")
								nextTest(true);
								return;
							}
							//setup reporting data
							var id = thistest.filename + ":" + thistest.title;
							report.tests[id] = {
									status: "running",
									result: null,
									message: null,
									title: thistest.title,
									filename: thistest.filename
								}
								//create an error context to catch exceptions and crashes in async code
							var domain = require('domain').create();
							domain.on('error', function(err)
								{
									//log error and go to next test on error
									report.tests[this.id].status = "error";
									report.tests[this.id].result = "error";
									report.tests[this.id].message = err.toString();
									console.log(this.id);
									console.log(err.stack);
									nextTest();
								}.bind({id:id}))
							console.log(id);
								//run the test in the error handling context
							domain.run(function()
							{
								//the actual test
								thistest.test(function(success, message)
								{
									//should return false or true
									report.tests[id].status = "complete";
									if (success)
										report.tests[id].result = "passed"
									else
										report.tests[id].result = "failed";
									report.tests[id].message = message;
									domain.exit();
									global.setTimeout(nextTest,500)
									
								})
							})
						}, nextStep);
					},
				], function()
				{
					cb();
				})
			},
			function wait(cb)
			{
				global.setTimeout(cb, 3000);
			},
			function killSandbox(cb)
			{
				driver.quit();
				console.log("Sandbox stop");
				sandbox.kill();
				sandbox.on('close', function(code)
				{
					cb();
				});
			}
		],
		function()
		{
			status = COMPLETE;
			console.log(report);
			if (cb2)
				cb2();
		})
}
var server = http.createServer();
server.on('request', function(request, response)
{
	request.url = decodeURI(request.url);
	if (request.url.indexOf("/ui/") == 0)
	{
		try
		{
			var data = fs.readFileSync("." + request.url);
			response.write(data)
		}
		catch (e)
		{
			response.writeHead(500);
			response.write(e.toString())
		}
		response.end();
	}
	if (request.url == "/runTests")
	{
		if (status == CANCELING)
		{
			console.log('already canceling')
			response.end();
			return;
		}
		console.log(status);
		if (status == RUNNING)
			status = CANCELING;
		async.until(function()
		{
			return status == COMPLETE || status == NOTSTARTED;
		}, function(cb)
		{
			console.log('waiting for cancel');
			global.setTimeout(cb, 1000);
		}, function()
		{
			console.log("staring run")
			updateAndRunTests(function()
			{
				console.log(stdoutLog);
				response.end();
			});
		})
	}
	if (request.url == "/status")
	{
		report.status = status;
		response.write(JSON.stringify(report));
		response.end();
	}
});
server.listen(8181);