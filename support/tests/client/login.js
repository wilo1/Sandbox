module.exports.title = "log in to the site"
module.exports.test = function(browser, cb)
{
    browser
        .url('http://localhost:3000/adl/sandbox/')
        .click('#logina').
    click('#txtusername').keys('Rob').pause(1000).
    click('#txtpassword').keys('1111').pause(1000).
    click('input[type="submit"]').pause(1000).
    url(function(err, url)
    {
        if (url.value == 'http://localhost:3000/adl/sandbox/')
            {
                cb(true)
                return;
            }
        else
        {
            browser.getText(".help-block")
            .then(function(text)
            {
                console.log('Title was: ' + text);
                cb(text.indexOf('Error') == -1, text);
            })
        }
    })
}