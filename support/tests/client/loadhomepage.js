module.exports.title = "Load the home page"
module.exports.test = function(browser,cb)
{
	browser
		
        .url('http://www.google.com')
        .getTitle()
        .then(function(title) {
            console.log('Title was: ' + title);
        })
        .catch(function(error) {
            console.log('uups something went wrong', error);
        })
        .then(cb(true));
}