module.exports.title = "load the homepage"
module.exports.test = function(browser,cb)
{
	browser
		
        .url('http://localhost:3000/adl/sandbox')
        .getTitle()
        .then(function(title) {
            console.log('Title was: ' + title);
            cb(true,title);
        })
        .catch(function(error) {
            console.log('uups something went wrong', error);
        })
        
}
