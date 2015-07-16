var async  = require('async'),
	helper = require('./helper.js'),
	state  = helper.READY;

//It's okay to already be in the "ready" state because initRunner is synchronous
helper.initRunner();

process.on("message", function(message, handle){
	var msgArr = message.split(helper.DELIMITER);
	var command = msgArr[0];
	var param = mgsArr[1];
	var outStr = "Message to runner has been ignored.";
	
	console.log("Received message!");
	
	if(command === helper.command.STATE){
		helper.sendMessage(process, helper.command.STATE, state);
	}
	
	else{
		switch(state){
			case helper.state.RUNNING: break;
			case helper.state.STOPPED: break;
			case helper.state.READY: outStr = handleReadyState(command, param); break;
		}
		
		process.send(outStr);
	}
});

//Runner is ready; handle incoming commands
function handleReadyState(command, param){
	var outMsg = "";
	
	if(command === helper.RUN){
		doRunCommand(param);
	}
	else if(command == helper.TERMINATE){
		outMsg = "We are shutting down";
	}
	else outMsg = "Error";
	
	return outMsg;
}

//Runner is currently executing a test; handle incoming commands
function handleRunningState(command, param){
	var outMsg = "";
	if(command === helper){}
	
	return outMsg;
}

function doRunCommand(param){
	console.log(param);
	if(!param) return;
	
	updateState(helper.state.RUNNING);
	
	console.log("Running test via external test runner...");
	console.log("Param: ", param);
	
	
	
	
	runSingleTest(param);
}

function runSingleTest(testId, done){
	//let server know about updated state, if necessary
	updateState(helper.state.RUNNING);

	async.series([
		startBrowser,
		_executeActualTestAsync(testId)
	], done);
}

function _executeActualTestAsync(testId){
	//returns a function suitable to be passed in to async.series.
	return function(cb){
		var testObj = helper.getSingleTestData(testId);
		
		testObj.test(global.browser, global.testUtils.completeTest(function(success, message) {
			logger.log("Success");
			
			var run = {
				id: testId
				status: "complete";
				result: success ? "passed" : "failed"
				message: message,
			};
			
			//send message letting server know about the test results
			helper.sendMessage(process, helper.COMMAND.RESULT, JSON.stringify(run));
			runLater(cb);
		})
	)};
}

function startBrowser(cb){
	browser.init().then(function() {
		cb()
	});
}

function updateState(newState){
	//Whenever there's a change in state, notify parent
	if(newState != state){
		helper.sendMessage(process, newState);
		state = newState;
	}
}

function runLater(fn, timeout){
	timeout = timeout ? timeout : 500;
	global.setTimeout(fn, timeout);
}

console.log("I am running!");