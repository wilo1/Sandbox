var webdriverio = require('webdriverio');
var options = {
    desiredCapabilities: {
        browserName: 'chrome'
    }
};
var client = webdriverio.remote(options);

client
    .init()
    .url('http://www.google.com')
    .getTitle()
        .then(function(title) {
            console.log('Title was: ' + title);
        })
        .catch(function(error) {
            console.log('uups something went wrong', error);
        })
    .end();