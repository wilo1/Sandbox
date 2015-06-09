var request = require('request'),

	logger = require('./logger.js');

// get all of a user's assets and format them as a content library
function entitiesToLibrary(user, type, res)
{
	var baseUrl;
	if(global.configuration.hostAssets){
		baseUrl = 'http://localhost:'+global.configuration.port+global.configuration.assetAppPath;
	}
	else {
		baseUrl = global.configuration.remoteAssetServerURL;
	}

	// set up type aliases
	var mimetype = type;
	switch(type){
		case 'entity':
			mimetype = 'application/vnd.vws-entity+json';
			type = 'asset';
			break;
		case 'material':
			mimetype = 'application/vnd.vws-material+json';
			break;
		case 'behavior':
			mimetype = 'application/vnd.vws-behavior+json';
			type = 'child';
			break;
	}

	request({
		uri: baseUrl+'/assets/by-meta/all-of',
		qs: {
			'user_name': user,
			'type': mimetype
		},
		json: true
	}, handleIndex);

	function handleIndex(err, xhr, data)
	{
		if(err){
			console.error(err);
			res.json({});
		}
		else
		{
			var metaToGet = Object.keys(data.matches).length;
			var lib = {};

			if(!metaToGet){
				res.json(lib);
			}

			for(var i in data.matches)
			{
				fetchMeta(i);

				function fetchMeta(id)
				{
					request({
						uri: baseUrl+'/assets/'+id+'/meta/name+thumbnail',
						json: true
					}, populateLib);
					
					function populateLib(err,xhr,data)
					{
						if(err){
							console.error('Failed to query asset', id, 'metadata:', err);
						}
						else {
							var key = data.name ? data.name : id;
							lib[key] = {
								url: baseUrl+'/assets/'+id,
								preview: data.thumbnail ?
									baseUrl+'/assets/'+id+'/meta/thumbnail'
									: "./img/VWS_Logo.png",
								type: type,
								sourceAssetId: id
							};

							metaToGet--;
							if(!metaToGet){
								res.json(lib);
							}
						}
					}
				}
			}
		}
	}
}

exports.entitiesToLibrary = entitiesToLibrary;
