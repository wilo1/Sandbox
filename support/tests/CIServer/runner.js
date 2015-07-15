var helper = require('./helper.js');

process.on("message", function(message, handle){
	var msgArr = message.split(helper.DELIMITER);
	var command = msgArr[0];
	var param = mgsArr[1];
	var outStr = "";
	
	console.log("Received message!");
	
	switch(command){
		case helper.RUN: handleRunCommand(param); break;
		case helper.STOP: outStr = "We are stopping!"; break;
		case helper.TERMINATE: outStr = "We are shutting down"; break;
	}
	
	process.send(outStr);
});

function handleRunCommand(param){
	console.log(param);
	if(!param) return;
	
	console.log("Running test via external test runner...");
	console.log("Param: ", param);
	
	console.log(runTest(param));
}

function runTest(testId){
	//given testId, get the appropriate test... may be cached	
	var test = helper.getSingleTestData(testId);
	
	
	return test;
}

console.log("I am running!");