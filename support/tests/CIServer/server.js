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
var files = [];

function findFiles(nextStep) {
    console.log("findFiles")
    fs.readdir("../client/",
        function(err, foundfiles) {
            files = foundfiles;
            nextStep();
        });
};

function readFiles(nextStep) {
    console.log("readFiles")
    //for each file
    async.eachSeries(files, function(filename, nextfile) {
        console.log(filename)
        //bail out of all tests if canceling
        if (status == CANCELING) {
            console.log("canceling run")
            global.setTimeout(nextStep, 50)
            return;
        }
        try {
            //each test can be a function that returns an array of tests, or a single test
            delete require.cache["../client/" + filename] // remove so the results are not cached, and the above git pull can update tests
            var test = require("../client/" + filename);
            var newTests = null;
            //the module is a function that returns an array of tests
            if (test instanceof Function)
                newTests = test();
            //the module is a test
            else if (test.test instanceof Function)
                newTests = [test]
            else //the module is a nightwatch style test
            {
                var title = Object.keys(test)[0]
                var newtest = test[title];
                if (newtest instanceof Function)
                    newTests = [{
                        title: title,
                        test: newtest
                    }]
            }
            tests = tests.concat(newTests)
            for (var i in newTests) {
                var test = newTests[i]
                test.filename = filename;
                var id = test.filename + ":" + test.title;
                report.tests[id] = {
                    status: "not started",
                    result: null,
                    message: null,
                    title: test.title,
                    filename: test.filename
                }
            }
        } catch (e) {
            report.tests[filename] = {
                status: "test load error",
                result: null,
                message: null,
                title: filename,
                filename: filename
            }

        }
        nextfile();
    }, nextStep);
}


function run_one_test(thistest, nextTest) {

    //setup reporting data
    var id = thistest.filename + ":" + thistest.title;
    report.tests[id] = {
        status: "running",
        result: null,
        message: null,
        title: thistest.title,
        filename: thistest.filename
    }
    var timeoutID = null;
    var handler = null;
    //create an error context to catch exceptions and crashes in async code
    var domain = require('domain').create();
    domain.on('error', function(err) {
        //log error and go to next test on error
        var id = thistest.filename + ":" + thistest.title;
        report.tests[id].status = "error";
        report.tests[id].result = "error";
        report.tests[id].message = err.toString()
        console.log(id);
        console.log(err.stack);
        console.log("DOMAIN ERROR")
        
        process.removeListener('uncaughtException', handler);
        global.clearTimeout(timeoutID);
        global.setTimeout(function()
        	{
        		domain.exit();
        		nextTest();
        	}, 500)
    })
    console.log("starting test " + id);
    //run the test in the error handling context
    
        handler = function(e) {
            //should return false or true
            report.tests[id].status = "error";
            report.tests[id].result = "error";
            report.tests[id].message = e.toString();
            domain.dispose();
            console.log(e.stack);
            process.removeListener('uncaughtException', handler);
            global.clearTimeout(timeoutID);
            console.log("EXCEPTION")
            global.setTimeout(nextTest, 500)
        }
        var timeout = function(e) {
            //should return false or true
            report.tests[id].status = "error";
            report.tests[id].result = "error";
            report.tests[id].message = "Total test timeout";
            domain.dispose();
            process.removeListener('uncaughtException', handler);
            global.clearTimeout(timeoutID);
            console.log("TIMEOUT")
            global.setTimeout(nextTest, 500)
        }
        timeoutID = global.setTimeout(timeout, 60 * 1000)
        process.on('uncaughtException', handler);
        //the actual test
        domain.bind(thistest.test)(global.browser, function(success, message) {
            //should return false or true
            console.log("SUCCESS")
            report.tests[id].status = "complete";
            if (success)
                report.tests[id].result = "passed"
            else
                report.tests[id].result = "failed";
            report.tests[id].message = message;
            global.clearTimeout(timeoutID);
            domain.dispose();
            process.removeListener('uncaughtException', handler);
            global.setTimeout(nextTest, 500)
        })
    

}

function startup_tests(cb) {
    status = RUNNING;
    stdoutLog = "";
    stderrLog = "";
    sandbox = null;
    webdriverio = require('webdriverio');
    options = {
        desiredCapabilities: {
            browserName: 'chrome'
        }
    };
    global.browser = webdriverio.remote(options);
    require('../utils/testutils').hookupUtils(browser);

    report.gitLog = "";
    cb();
}

function startSandbox(cb) {
    console.log("Sandbox start");
    //start the sandbox server
    sandbox = childprocess.spawn("node", ["app.js"], {
        cwd: "../../../"
    });
    sandbox.stdout.on('data', function(data) {
        //Wait for startup complete
        if (data.toString().indexOf("Startup complete") > -1)
            cb();
    })
}

function startBrowser(cb) {
    browser.init().then(function() {
        cb()
    });
}

function killSandbox(cb) {
    console.log("Sandbox stop");
    sandbox.kill();
    sandbox.on('close', function(code) {
        cb();
    });
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
            startBrowser,
            //run the selenium tests
            function findAndRunTests(cb) {
                console.log("findAndRunTests")
                report.tests = {};
                files = [];
                tests = [];
                async.series([

                    findFiles,
                    readFiles,
                    function runTests(nextStep) {
                        //for each test in this file
                        async.eachSeries(tests, function(thistest, nextTest) {
                            //bail out of all tests if canceling
                            if (status == CANCELING) {
                                console.log("canceling run")
                                global.setTimeout(nextTest, 500)
                                return;
                            }
                            run_one_test(thistest, nextTest)
                        }, nextStep);
                    },
                ], function() {
                    cb();
                })
            },
            function wait(cb) {
                browser.end().then(cb)
            },
            killSandbox
        ],
        function() {
            status = COMPLETE;
            if (cb2)
                cb2();
        })
}

function cancel_run(cancelComplete) {
    if (status == CANCELING) {
        console.log('already canceling')
        return;
    }
    console.log(status);
    if (status == RUNNING)
        status = CANCELING;
    async.until(function() {
        return status == COMPLETE || status == NOTSTARTED;
    }, function(cb) {
        console.log('waiting for cancel');
        global.setTimeout(cb, 1000);
    }, function() {
        cancelComplete();
    })
}

function gitPull(pullComplete) {
    console.log("Git Pull");
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
            console.log('ps process exited with code ' + code);
        }
        pullComplete();
    });
};

function quit_and_reload() {
    console.log("staring run")
    server._connections = 0;
    server.close(function() {
        gitPull(function() {
            console.log('restart');
            global.setTimeout(function() {
                console.log('spawn');
                var child = require('child_process').spawn('node', ['server.js'], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                console.log('close');
                global.setTimeout(function() {
                    process.exit();
                }, 1000);
            });
        }, 500)
    });
}

function quit_and_restart() {
    console.log("staring run")
    server._connections = 0;
    server.close(function() {
        gitPull(function() {
            console.log('restart');
            global.setTimeout(function() {
                console.log('spawn');
                var child = require('child_process').spawn('node', ['server.js', 'start'], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                console.log('close');
                global.setTimeout(function() {
                    process.exit();
                }, 1000);
            });
        }, 500)
    });
}
var server = http.createServer();
server.on('request', function(request, response) {
    request.url = decodeURI(request.url);
   
    if (request.url ==="/ui/") {
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
        response.end();
        request.connection.destroy();
        cancel_run(quit_and_restart);
    }
    if (request.url == "/quit") {

        cancel_run(function() {
            process.exit();
        });
        setTimeout(function()
        {
            process.exit();
        },5000)
    }
    if (request.url == "/stop") {

        cancel_run(function() {

        });
    }
    if (request.url == "/reload") {

        cancel_run(quit_and_reload);
        setTimeout(function()
        {
            quit_and_reload();
        },5000)
    }
    if (request.url == "/status") {
        report.status = status;
        response.write(JSON.stringify(report));
        response.end();
    }
    if (request.url.indexOf("/runOne") == 0) {
        cancel_run(function() {
            var tid = request.url.substr(request.url.indexOf('?') + 1)
            tid = decodeURIComponent(tid)
            console.log(tid);
            response.end();
            for (var i in tests) {
                var tid2 = tests[i].filename + ":" + tests[i].title;
                if (tid == tid2) {
                    status = RUNNING;
                    async.series([
                        startup_tests,
                        startSandbox,
                        startBrowser,
                        function(cb) {
                            run_one_test(tests[i], cb)
                        },
                        killSandbox,
                        function wait(cb) {
                            browser.end().then(cb)
                        },
                    ], function() {
                        status = COMPLETE;
                    });
                    return;

                }
            }

        });
    }
});
server.listen(8181);
if (process.argv.indexOf('start') > -1)
    updateAndRunTests(function() {})
else
    findFiles(function() {
        readFiles(function() {})
    })