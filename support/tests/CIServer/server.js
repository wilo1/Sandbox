var helper = require('./helper.js');

var async = require("async")
var http = require("http");
var path = require("path");
var childprocess = require("child_process");
var fs = require('fs');
var stdoutLog = "";
var stderrLog = "";
var report = {};
report.tests = {};
var cancel = false;
var RUNNING = 1;
var COMPLETE = 0;
var CANCELING = 2;
var NOTSTARTED = 3;
var status = NOTSTARTED;
var tests = [];
var files = helper.files;
var findFiles = helper.findFiles;

var runner = childprocess.fork("runner.js");
runner.send("run");

runner.on("message", function(nope, yup){
	console.log("Message!!!: ", nope, yup);
});

runner.on("error", function(a, b){
	
	console.log("This is the error: ", a, b);
});

runner.on("exit", function(a, b){
	console.log("Runner exited");
});

function readFiles(nextStep) {
	logger.log("readFiles")
	//for each file
	async.eachSeries(files, function(filename, nextfile) {
		logger.log(filename);
		//bail out of all tests if canceling
		if (status == CANCELING) {
			logger.log("canceling run")
			global.setTimeout(nextStep, 50)
			return;
		}
		try {
			var newTests = helper.getAllTestData(filename);
			tests = tests.concat(newTests)
			for (var i in newTests) {
				var test = helper.createTest(newTests[i].title, filename);
				var id = test.filename + ":" + test.title;
				report.tests[id] = test;
			}
		} catch (e) {
			report.tests[filename] = helper.createTest(filename, filename);
			report.tests[filename].status = "test load error";
		}
		nextfile();
	}, nextStep);
}

function runTest(test, nextTest) {

	var id = test.filename + ":" + test.title;
	
	console.log(report.tests[id]);
	
	report.tests[id] = {
		status: "running",
		result: null,
		message: null,
		title: test.title,
		filename: test.filename,
		runs: []
	}
	var originalTitle = test.title;
	webdriverio = require('webdriverio');
	options = {
		desiredCapabilities: {
			browserName: 'firefox'
		}
	};
	async.eachSeries(['chrome','firefox'/*,'ie11'*/], function(browserName, nextBrowser) {
		async.series([
			function initBrowser(cb) {
				options.desiredCapabilities.browserName = browserName;
				global.browser = webdriverio.remote(options);
				global.testUtils.hookupUtils(browser);
				browser.init().then(function() {
					cb();
				});
			},
			function runTheTest(cb) {
				test.title = originalTitle ;
				runTest_one_browser(test, options.desiredCapabilities.browserName, report.tests[id], cb)
			},
			function closeTheBrowser(cb)
			{
				browser.endAll();
				cb();
			}
		], function finishedAllBrowsers() {
			nextBrowser();
		});
	},function()
	{
		test.title = originalTitle;
		report.tests[id].status = "complete";
		nextTest();
	})
}

function runTest_one_browser(thistest, browsername, report, next) {

	//setup reporting data
	var run = {
		status: "running",
		result: null,
		message: null,
		browsername:browsername
	}
	report.runs.push(run);
	var timeoutID = null;
	var handler = null;
	//create an error context to catch exceptions and crashes in async code
	var domain = require('domain').create();
	domain.on('error', function(err) {
		//log error and go to next test on error
		var id = thistest.filename + ":" + thistest.title;
		run.status = "error";
		run.result = "error";
		run.message = err.toString()
		logger.log(id);
		logger.log(err.stack);
		logger.log("DOMAIN ERROR")

		process.removeListener('uncaughtException', handler);
		global.clearTimeout(timeoutID);
		global.setTimeout(function() {
			domain.exit();
			next();
		}, 500)
	})
	//logger.log("starting test " + id);
	//run the test in the error handling context

	handler = function(e) {
		//should return false or true
		logger.log("EXCEPTION", JSON.stringify(e))

		run.status = "error";

		run.result = "error"

		run.message = " " + e.toString() + "; ";
		global.clearTimeout(timeoutID);
		domain.exit();
		process.removeListener('uncaughtException', handler);
		global.setTimeout(function() {

			next();
		}, 500)
	}
	var timeout = function(e) {
		//should return false or true
		logger.log("TIMEOUT")

		run.status = "timeout";

		run.result = "timeout"

		run.message = e;
		global.clearTimeout(timeoutID);
		domain.exit();
		process.removeListener('uncaughtException', handler);
		global.setTimeout(function() {

			next();
		}, 500)
	}
	
	//	timeoutID = global.setTimeout(timeout, 60 * 1000)
	process.on('uncaughtException', handler);
	
	//the actual test
	domain.bind(thistest.test)(global.browser, global.testUtils.completeTest(function(success, message) {
		//should return false or true
		logger.log("SUCCESS")

		run.status = "complete";
		if (success)
			run.result = "passed"
		else
			run.result = "failed";
		run.message = message;
		global.clearTimeout(timeoutID);
		domain.exit();
		process.removeListener('uncaughtException', handler);
		global.setTimeout(function() {

			next();
		}, 500)

	}));
}

function updateAndRunTests(cb2) {
	//bail if already running. This really should never happen
	if (status == RUNNING) {
		cb2();
		return;
	}

	async.series([

			startup_tests,

			function getLog(cb) {
				var log = childprocess.spawn("git", ["log", '-1'], {
					cwd: "../../../"
				});
				log.stdout.on('data', function(data) {
					//Wait for startup complete
					report.gitLog += data.toString();
				})
				log.on('close', cb)
			},
			//do a get pull and update the dev branch
			startSandbox,
			// startBrowser,
			//run the selenium tests
			function findAndRunTests(cb) {
				logger.log("findAndRunTests")
				report.tests = {};
				
				//Remove all elements from files and tests arrays
				//files.length = 0;
				tests.length = 0;
				
				async.series([

					helper.findFiles,
					readFiles,
					function runTests(nextStep) {
						//for each test in this file
						async.eachSeries(tests, function(thistest, nextTest) {


							//bail out of all tests if canceling
							if (status == CANCELING) {
								logger.log("canceling run")
								global.setTimeout(nextTest, 500)
								return;
							}
							logger.log('browser starting')
							startBrowser(function() {
								runTest(thistest, function() {
									logger.log('browser ending')
									browser.end()
									nextTest();
								})
							})

						}, nextStep);
					},
				], function() {
					cb();
				})
			},
			/*   function wait(cb) {
				logger.log('Wait for browser close')
				browser.end()
				cb();
			},*/
			killSandbox
		],
		function() {
			status = COMPLETE;
			logger.log('Run all tests exit')
			if (cb2)
				cb2();
		})
}

function cancel_run(cancelComplete) {
	cancelComplete();
	return; 
	
	if (status == CANCELING) {
		logger.log('already canceling')
		return;
	}
	if (status == RUNNING)
		status = CANCELING;
	async.until(function() {
		return status == COMPLETE || status == NOTSTARTED;
	}, function(cb) {
		logger.log('waiting for cancel');
		global.setTimeout(cb, 1000);
	}, function() {
		cancelComplete();
	})
}

function gitPull(pullComplete) {
	logger.log("Git Pull");
	var gitpull = childprocess.spawn("git", ["pull"], {
		cwd: "../../../",
		//stdio:'inherit' 
	});
	//log errors
	gitpull.stdout.on('data', function(data) {
		report.gitLog += data.toString();
	});
	gitpull.stderr.on('data', function(data) {
		report.gitLog += data.toString();
	});
	//wait for process to complete
	gitpull.on('close', function(code) {
		if (code !== 0) {
			logger.log('ps process exited with code ' + code);
		}
		pullComplete();
	});
};

function quit(done){
	logger.log("staring run")
	server._connections = 0;
	server.close(done);
}

function loadChildProcess(done){
	var params = this.params ? this.params : ['server.js'];
	
	logger.log('restart');
	global.setTimeout(function() {
		logger.log('spawn');
		var child = require('child_process').spawn('node', params, {
			detached: true,
			stdio: 'ignore'
		});
		child.unref();
		logger.log('close');
		done();
		
		global.setTimeout(function() {
			logger.log('killing server');
			process.kill(process.pid);
			process.exit();
		}, 1000);
	}, 500);
}

function reload() {
	//quit, then do a git pull, then (re)load the child process, binding it to a parameters object
	var paramObj = {params: ['server.js']};
	async.series([quit, gitPull, loadChildProcess.bind(paramObj)]);
}

function restart() {
	//quit, then do a git pull, then (re)start the child process, binding it to a parameters object
	var paramObj = {params: ['server.js', 'start']};
	async.series([quit, gitPull, loadChildProcess.bind(paramObj)]);
}

var server = http.createServer();
server.on('request', function(request, response) {
	request.url = decodeURI(request.url);

	if (request.url === "/ui/") {
		request.url += 'tests.html'
	}
	if (request.url.indexOf("/ui/") == 0) {
		try {
			var data = fs.readFileSync("." + request.url);
			response.write(data)
		} catch (e) {
			response.writeHead(500);
			response.write(e.toString())
		}
		response.end();
	}
	if (request.url == "/runTests") {

		setTimeout(function() {
			restart();
		}, 5000)
		response.end();
		request.connection.destroy();
		cancel_run(restart);


	}
	if (request.url == "/quit") {

		setTimeout(function() {
			logger.log('killing server');
			process.kill(process.pid);
			process.exit();
		}, 5000)

		cancel_run(function() {
			process.exit();
		});

		logger.log('killing server');
		process.kill(process.pid);
		process.exit();

	}
	if (request.url == "/stop") {

		cancel_run(function() {

		});
	}
	if (request.url == "/reload") {

		setTimeout(function() {
			reload();
		}, 5000)
		cancel_run(reload);

	}
	if (request.url == "/status") {
		report.status = status;
		report.log = logger._log;
		response.write(JSON.stringify(report));
		response.end();
	}
	if (request.url.indexOf("/runOne") == 0) {
		logger.log("Awesome stuff..");
		cancel_run(function() {
			var tid = request.url.substr(request.url.indexOf('?') + 1)
			tid = decodeURIComponent(tid)
			logger.log(tid);
			response.end();
			
			helper.sendCommand(runner, helper.RUN, tid);
			for (var i in tests) {
				var tid2 = tests[i].filename + ":" + tests[i].title;
				
				if (tid == tid2) {
					
					
					/*
					status = RUNNING;
					async.series([
						startup_tests,
						startSandbox,
						startBrowser,
						function(cb) {
							runTest(tests[i], cb)
						},
						function wait(cb) {
							logger.log('Wait for browser close')
							browser.end()
							cb();
						},
						function(cb) {
							killSandbox(function() {
								logger.log('finised killing sandbox')
								cb();
							})
						}

					], function(err) {
						console.log(err)
						logger.log('Run one test exit')
						status = COMPLETE;
					});
					return;
					*/

				}
			}

		});
	}
});
var port = 8181;

var p = process.argv.indexOf('-p');
port = p >= 0 ? parseInt(process.argv[p + 1]) : 8181;

server.listen(port);
if (process.argv.indexOf('start') > -1)
	updateAndRunTests(function() {})
else
	helper.findFiles(function() {
		readFiles(function() {})
	})
