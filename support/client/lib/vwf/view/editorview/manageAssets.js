define({
	initialize: function(){
		
		$("<link rel='stylesheet' href='vwf/view/editorview/css/assets.css'/>").appendTo(document.head);
		$('<div id="manageAssetsContainer"></div>').appendTo(document.body);

		$('#manageAssetsContainer').load('vwf/view/editorview/manageAssets.html',function()
		{
			$('#manageAssetsDialog').dialog({
				title: 'Manage Assets',
				width: 600,
				height: 600,
				autoOpen: false
			});
		});
	}
});
