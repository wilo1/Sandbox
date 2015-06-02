define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('ManageAssetsDialog', []);
	var dataRoot = null;

	window.setMime = function(files){
		console.log(files);
		var typeInput = $('#manageAssetsDialog input#typeInput');
		if(files[0]){
			typeInput.val( files[0].type );
		}
		else {
			typeInput.val('');
		}
	}


	app.factory('DataManager', ['$rootScope','$http', function($rootScope, $http)
	{
		dataRoot = $rootScope;
		$rootScope.fields = {selected: 'new'};

		$rootScope.refreshData = function(id)
		{
			$http.get('/adl/sas/assets/by-meta/all-of?user_name='+_UserManager.GetCurrentUserName()+'&isSandboxAsset=true').success(
				function(list)
				{
					$rootScope.assets = list.matches;

					for(var id in $rootScope.assets)
					{
						(function(id){
							$http.get('/adl/sas/assets/'+id+'/meta/name+description+permissions?permFormat=json').success(function(data){
								$rootScope.assets[id].name = data.name;
								$rootScope.assets[id].description = data.description;
								$rootScope.assets[id].permissions = data.permissions;
							});
						})(id);
					}
				}
			);
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

		$scope.$watch('fields.selected', function(newval)
		{
			fileInput.replaceWith( fileInput.val('').clone(true) );
			if( $scope.assets && newval !== 'new' )
				$scope.selected = $scope.assets[newval];
			else
				$scope.selected = $scope.new;
		});
		
		$scope.markDirty = function(id){
			if( id )
				$scope.assets[id]._dirty = true;
		}

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

		$scope.saveData = function()
		{
			var fileInput = $('#preview input#fileInput');
			var file = fileInput[0].files[0];
			
			if( file )
			{
				if( $scope.fields.selected === 'new' )
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
						if(xhr.status === 201){
							$scope.refreshData();
							$scope.fields.selected = xhr.responseText;
							$scope.resetNew();
							fileInput.replaceWith( fileInput.val('').clone(true) );
						}
						else {
							alertify.alert('Upload failed: '+ xhr.responseText);
						}
					});

					xhr.open('POST', url);
					xhr.setRequestHeader('Content-Type', $('#manageAssetsDialog input#typeInput').val());
					xhr.send(file);

				}
				else
				{
					
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
