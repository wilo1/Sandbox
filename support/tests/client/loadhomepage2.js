module.exports.title = "steven's tests"
module.exports.test = function(browser,cb)
{
	browser
		
        .url('http://localhost:3000/adl/sandbox/features')
        .getTitle()
        .then(function(title) {
            console.log('Title was: ' + title);
            cb(true,title);
        })
        .catch(function(error) {
            console.log('uups something went wrong', error);
        })
        
}
