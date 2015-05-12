module.exports.title = "load the demo page 2"
module.exports.test = function(browser,cb)
{
	browser
		
        .url('http://sandbox.adlnet.gov/adl/sandbox/demos')
        .getTitle()
        .then(function(title) {
            console.log('Title was: ' + title);
            cb(true,title);
        })
        
        
}