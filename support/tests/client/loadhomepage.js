module.exports.title = "Create a sphere from the menu"
module.exports.test = function(cb)
{
	browser
		.init()
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