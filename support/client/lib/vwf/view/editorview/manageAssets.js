define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('ManageAssetsDialog', []);
	var dataRoot = null;


	app.factory('DataManager', ['$rootScope','$http', function($rootScope, $http)
	{
		dataRoot = $rootScope;
		$rootScope.fields = {selected: null};
		$rootScope.assets = {};

		$rootScope.refreshData = function(id)
		{
			function updateAsset(id){
				$http.get('/adl/sas/assets/'+id+'/meta?permFormat=json').success(function(data){
					$rootScope.assets[id] = data;
					$rootScope.assets[id].id = id;
				});
			}

			if(id){
				updateAsset(id);
			}
			else {
				$http.get('/adl/sas/assets/by-meta/all-of?user_name='+_UserManager.GetCurrentUserName()+'&isSandboxAsset=true').success(
					function(list)
					{
						for(var id in list.matches){
							updateAsset(id);
						}
					}
				);
			}
		}

		return null;
	}]);

	app.filter('sortKeys', function(){
		return function(input, field, reverse)
		{
			input = input || {};
			field = field || 'last_modified';
			var out = [];
			for(var i in input){
				out.push(input[i]);
			}

			out.sort(function(a,b){
				var ret = 0;
				if(a[field] < b[field]) ret =  -1;
				else if(a[field] == b[field]) ret =  0;
				else ret =  1;
				return reverse ? -ret : ret;
			});

			return out;
		};
	});

	app.controller('AssetListController', ['$scope','$rootScope','DataManager', function($scope,$rootScope)
	{
		$scope.setSelected = function(id){
			$scope.fields.selected = id;
		}
	}]);

	app.controller('AssetPropertiesController', ['$scope','$rootScope','$http','DataManager', function($scope,$rootScope,$http)
	{
		// build resonable defaults for new uploads
		$scope.resetNew = function(){
			$scope.new = {
				permissions: {
					user: {
						read: true,
						write: true,
						delete: true
					},
					group: {
						read: true
					},
					other: {
						read: true
					}
				}
			};
		}
		$scope.resetNew();


		// keep 'selected' in sync with currently selected asset
		$scope.$watchGroup(['fields.selected', 'assets[fields.selected]'], function(newvals)
		{
			$scope.clearFileInput( $('#manageAssetsDialog input#fileInput') );
			$scope.clearFileInput( $('#manageAssetsDialog input#thumbnailInput') );

			if( newvals[0] && newvals[0] !== 'new' )
				$scope.selected = newvals[1];
			else
				$scope.selected = $scope.new;
		});


		// roll up the various dirty flags into an asset-level one
		$scope.$watchGroup(['selected._basicDirty','selected._groupDirty','selected._permsDirty'], function(newvals){
			$scope.selected._dirty = newvals[0] || newvals[1] || newvals[2];
		});


		// auto-fill mime type field when file is selected
		window.setMime = function(files)
		{
			var typeInput = $('#manageAssetsDialog input#typeInput');
			if(files[0]){
				typeInput.val( files[0].type );
			}
			else {
				typeInput.val('');
			}
			$scope.selected._dirty = true;
		}

		
		// hook up thumbnail detection
		window.setThumbnailDirty = function(){
			$scope.selected._dirty = true;
			$scope.$apply();
		}

		// since file inputs are read-only...
		$scope.clearFileInput = function(input){
			input.replaceWith( input.val('').clone(true) );
		}


		// generate octal perms from checkbox array
		$scope.getPackedPermissions = function(){
			var perms = 0;
			if($scope.selected.permissions.user){
				perms = perms |
					$scope.selected.permissions.user.read * 0400 |
					$scope.selected.permissions.user.write * 0200 |
					$scope.selected.permissions.user.delete * 0100;
			}
			if($scope.selected.permissions.group){
				perms = perms |
					$scope.selected.permissions.group.read * 0040 |
					$scope.selected.permissions.group.write * 0020 |
					$scope.selected.permissions.group.delete * 0010;
			}
			if($scope.selected.permissions.other){
				perms = perms |
					$scope.selected.permissions.other.read * 0004 |
					$scope.selected.permissions.other.write * 0002 |
					$scope.selected.permissions.other.delete * 0001;
			}

			return perms;
		}


		// write asset data to the server
		$scope.saveData = function(id)
		{
			var fileInput = $('#preview input#fileInput');
			var file = fileInput[0].files[0];
			
			if( !id || id === 'new' )
			{
				if( file )
				{
					var perms = $scope.getPackedPermissions();

					var url = '/adl/sas/assets/new?isSandboxAsset=true';
					if( $scope.selected.name )
						url += '&name='+ encodeURIComponent( $scope.selected.name );
					if( $scope.selected.description )
						url += '&description='+ encodeURIComponent( $scope.selected.description );
					if( $scope.selected.group_name )
						url += '&group_name='+ encodeURIComponent( $scope.selected.group_name );
					if( perms )
						url += '&permissions='+ perms.toString(8);

					var xhr = new XMLHttpRequest();
					xhr.addEventListener('loadend', function(e)
					{
						if(xhr.status === 201)
						{
							$scope.refreshData(xhr.responseText);
							$scope.fields.selected = xhr.responseText;
							$scope.saveThumbnail();
							$scope.resetNew();
							$scope.clearFileInput(fileInput);
						}
						else {
							alertify.alert('Upload failed: '+ xhr.responseText);
						}
					});

					xhr.open('POST', url);
					xhr.setRequestHeader('Content-Type', $('#manageAssetsDialog input#typeInput').val());
					xhr.send(file);

				}
				else {
					alertify.alert('You must select a file to upload');
				}
			}
			else
			{
				var toComplete = 0;

				function checkRemaining(){
					toComplete -= 1;
					if( toComplete === 0 ){
						$scope.refreshData($scope.selected.id);
					}
				}

				if(file)
				{
					toComplete += 1;

					var xhr = new XMLHttpRequest();
					xhr.addEventListener('loadend', function(e)
					{
						if( xhr.status !== 200 ){
							alertify.alert('Upload failed: '+xhr.responseText);
						}
						else {
							$scope.clearFileInput( fileInput );
						}
						checkRemaining();
					});
					xhr.open('POST', '/adl/sas/assets/'+$scope.selected.id);
					xhr.setRequestHeader('Content-Type', $('#manageAssetsDialog input#typeInput').val());
					xhr.send(file);
				}

				if($scope.selected._basicDirty)
				{
					toComplete += 1;
					var meta = {name: $scope.selected.name, description: $scope.selected.description};
					$http.post('/adl/sas/assets/'+$scope.selected.id+'/meta', meta).success(checkRemaining)
					.error(function(data,status){
						alertify.alert('Failed to post metadata: '+data);
						checkRemaining();
					});
				}

				if($scope.selected._groupDirty)
				{
					toComplete += 1;
					$http.post('/adl/sas/assets/'+$scope.selected.id+'/meta/group_name', $scope.selected.group_name).success(checkRemaining)
					.error(function(data,status){
						alertify.alert('Failed to change group: '+data);
						checkRemaining();
					});
				}

				if($scope.selected._permsDirty)
				{
					var perms = $scope.getPackedPermissions();
					toComplete += 1;
					$http.post('/adl/sas/assets/'+$scope.selected.id+'/meta/permissions', perms.toString(8)).success(checkRemaining)
					.error(function(data,status){
						alertify.alert('Failed to change permissions: '+data);
						checkRemaining();
					});
				}

				$scope.saveThumbnail();
			}
		}

		$scope.saveThumbnail = function()
		{
			var thumbInput = $('#manageAssetsDialog input#thumbnailInput');
			var thumb = thumbInput[0].files[0];
			if(thumb)
			{
				if( $scope.selected.thumbnail )
				{
					var id = /^asset:([A-Fa-f0-9]{8})$/.exec($scope.selected.thumbnail)[1];
					var xhr = new XMLHttpRequest();
					xhr.addEventListener('loadend', function(e)
					{
						if( xhr.status !== 200 ){
							alertify.alert('Thumbnail upload failed: '+xhr.responseText);
						}
						else {
							$scope.clearFileInput( thumbInput );
						}
					});
					xhr.open('POST', '/adl/sas/assets/'+id);
					xhr.setRequestHeader('Content-Type', thumb.type);
					xhr.send(thumb);

				}
				else
				{
					var xhr = new XMLHttpRequest();
					xhr.addEventListener('loadend', function(e)
					{
						if( xhr.status !== 201 ){
							alertify.alert('Thumbnail upload failed: '+xhr.responseText);
						}
						else {
							$scope.clearFileInput( thumbInput );
							$http.post('/adl/sas/assets/'+$scope.selected.id+'/meta/thumbnail', 'asset:'+xhr.responseText)
							.success(function(data){
								$scope.refreshData($scope.selected.id);
							})
							.error(function(data){
								alertify.alert('Failed to upload thumbnail: '+data);
							});
						}
					});
					xhr.open('POST', '/adl/sas/assets/new?name='+encodeURIComponent($scope.selected.name+' thumbnail'));
					xhr.setRequestHeader('Content-Type', thumb.type);
					xhr.send(thumb);
				}
			}

		}

		$scope.deleteData = function(id)
		{
			alertify.confirm('Are you POSITIVE you want to delete this asset?', function()
			{
				$http.delete('/adl/sas/assets/'+id)
				.success(function(){
					$scope.refreshData();
					$scope.fields.selected = null;
				})
				.error(function(data){
					alertify.alert('Delete failed: '+data);
					$scope.refreshData();
					$scope.fields.selected = null;
				});
			});
		}

	}]);

	return {

		initialize: function()
		{
			// actually insert the html
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

				angular.bootstrap($('#manageAssetsDialog')[0], ['ManageAssetsDialog']);
			});
		},

		refreshData: function(){
			dataRoot.refreshData();
		}
	};
	
});
