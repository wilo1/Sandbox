var request = require('request');


function assetsToLibrary(user, res)
{
	var baseUrl;
	if(global.configuration.hostAssets){
		baseUrl = global.configuration.assetAppPath;
	}
	else {
		baseUrl = global.configuration.remoteAssetServerURL;
	}
}

exports.assetsToLibrary = assetsToLibrary;
