var fs = require('fs');

var exports = module.exports = {
	DELIMITER: "$$",
	files: []
};

exports.command = {
	RUN: "run",
	STOP: "stop", 
	TERMINATE: "terminate",
	STATE: "state",
	RESULT: "result"
};

exports.state = {
	RUNNING: 1,
	STOPPED: 2,
	READY: 3
};

/*
* Internal Properties
*/

var cacheTests = {};
var sandbox;
var webdriverio;
var is

/*
* Public Functions
*/

exports.sendMessage = function(runner, command, param){
	console.log("sending command...");
	
	if(param) runner.send(command + exports.DELIMITER + param);	
	else runner.send(command);	
};

exports.clearCache = function(){
	for(filename in cacheTests){
		// remove so the results are not cached, and the git pull can update tests
		if(cacheTests.hasOwnProperty(filename)){
			delete require.cache["../client/" + filename];
			delete cacheTests[filename];
		}
	}
};

exports.getAllTestData = function(filename){	
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

exports.initRunner = function(){
	webdriverio = require('webdriverio');
	var options = {
		desiredCapabilities: {
			browserName: 'firefox'
		}
	};
	
	global.browser = webdriverio.remote(options);
	console.log(Object.keys(global.browser));

	global.testUtils = require('../utils/testutils');
	global.testUtils.hookupUtils(browser);
};

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
}

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
