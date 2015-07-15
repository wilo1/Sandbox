var fs = require('fs');

var exports = module.exports = {
	RUN: "run",
	STOP: "stop", 
	TERMINATE: "terminate",
	DELIMITER: "$$",
	files: []
};

/*
* Internal Properties
*/

var cacheTests = {};
var sandbox;

/*
* Public Functions
*/

exports.sendCommand = function(runner, command, param){
	console.log("helper is sending commnad...");
	runner.send(command + exports.DELIMITER + param);	
}

exports.clearCache = function(){
	for(filename in cacheTests){
		// remove so the results are not cached, and the git pull can update tests
		if(cacheTests.hasOwnProperty(filename)){
			delete require.cache["../client/" + filename];
			delete cacheTests[filename];
		}
	}
}

exports.getAllTestData = function getAllTestData(filename){	
	//each test can be a function that returns an array of tests, or a single test
	if(cacheTests[filename]){
		return cacheTests[filename];
	}

	var test = require("../client/" + filename);
	var testData = null;
	
	//the module is a function that returns an array of tests
	if (test instanceof Function)
		testData = test();
	
	//the module is a test
	else if (test.test instanceof Function)
		testData = [test]
	
	else //the module is a nightwatch style test
	{
		var title = Object.keys(test)[0]
		var newtest = test[title];
		if (newtest instanceof Function){
			testData = [{
				title: title,
				test: newtest
			}];
		}
	}
	
	cacheTests[filename] = testData;
	return testData;
};

exports.getSingleTestData = function(testId){	
	var tempArr = testId.split(":");
	var filename = tempArr[0];
	var title = tempArr[1];
	
	//Given a filename, get an array of test objects
	var allTests = exports.getAllTestData(filename);
	
	//Search for single test with matching title and return it if found
	for(var i = 0; i < allTests.length; i++){
		if(title === allTests[i].title){
			return allTests[i];
		}
	}
	
	return null;
};

exports.createTest = function(title, filename){
	return {
		status: "not started",
		result: null,
		message: null,
		title: title,
		filename: filename,
		runs: []
	};
};

exports.findFiles = function(nextStep, dir){
	exports.files.length = 0;
	findFiles(nextStep, dir)
};

exports.initAll = function(){
	
};

function startup_tests(cb) {
	status = RUNNING;
	stdoutLog = "";
	stderrLog = "";
	sandbox = null;
	
	
	webdriverio = require('webdriverio');
	options = {
		desiredCapabilities: {
			browserName: 'firefox'
		}
	};
	global.browser = webdriverio.remote(options);
	console.log(Object.keys(global.browser));

	global.testUtils = require('../utils/testutils');
	global.testUtils.hookupUtils(browser);

	report.gitLog = "";
	cb();
}

function startSandbox(cb) {
	logger.log("Sandbox start");
	//start the sandbox server
	sandbox = childprocess.spawn("node", ["app.js"], {
		cwd: "../../../"
	});
	var startupGood = false;
	sandbox.stdout.on('data', function(data) {
		//Wait for startup complete
		if (data.toString().indexOf("Startup complete") > -1) {
			startupGood = true;
			sandbox.removeAllListeners('exit')
			cb();
		}
	})
	sandbox.on('exit', function(code) {
		if (sandbox && startupGood == false) {
			logger.log('sandbox exit without good start')
			sandbox = null;
			cb();
		}
	});
}

function startBrowser(cb) {
	browser.init().then(function() {
		cb()
	});
}

function killSandbox(cb) {
	logger.log("Sandbox stop");
	var called = false;
	if (sandbox) {
		var timeoutid = setTimeout(function() {
			called = true;
			logger.log('exiting calling callback')
			cb();
		}, 2000)
		sandbox.on('exit', function(code) {
			sandbox = null;
			if (!called) {
				clearTimeout(timeoutid)
				called = true;
				logger.log('exiting calling callback')
				cb();
			}
		});
		sandbox.kill();
	} else {
		cb()
	}
}

/*
* Internal Utility Functions
*/

function findFiles(nextStep, dir) {
	logger.log("findFiles")
	var foundFiles;
	var baseDir = "../client/";
	var dirList = [];

	dir = dir ? dir : "";
	
	try {
		foundFiles = fs.readdirSync(baseDir + dir);
	} catch (e) {
		console.log("Error reading files: ", e);
		if (nextStep) nextStep();
		return;
	}

	//iterate over "foundFiles" and if directory, recursively call findFiles...
	for (var i = 0; i < foundFiles.length; i++) {
		if (fs.lstatSync(baseDir + dir + foundFiles[i]).isDirectory())
			dirList.push(dir + foundFiles[i] + "/");

		else
			exports.files.push(dir + foundFiles[i]);
	}

	for (var i = 0; i < dirList.length; i++)
		findFiles(null, dirList[i]);

	if (nextStep) nextStep();	
};

/*
* Global Functions
*/

global.logger = {
	log: function() {
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (arg instanceof Number)
				this._log += arg + '\n';
			else if (arg instanceof String)
				this._log += arg + '\n';
			else if (arg instanceof Object)
				this._log += JSON.stringify(arg) + '\n';
			else if (arg)
				this._log += arg.toString() + '\n';
		}
	},
	_log: ""
};
