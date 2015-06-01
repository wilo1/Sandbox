define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('ManageAssetsDialog', []);
	var dataRoot = null;

	app.factory('DataManager', ['$rootScope','$http', function($rootScope, $http)
	{
		dataRoot = $rootScope;
		$rootScope.refreshData = function()
		{
			$http.get('/adl/sas/assets/by-meta/all-of?user_name='+_UserManager.GetCurrentUserName()+'&isSandboxAsset=true').success(
				function(list)
				{
					$rootScope.assets = list.matches;
	
					for(var id in $rootScope.assets)
					{
						$http.get('/adl/sas/assets/'+id+'/meta/name+description+permissions?permFormat=json').success(function(data){
							$rootScope.assets[id].name = data.name;
							$rootScope.assets[id].description = data.description;
							$rootScope.assets[id].permissions = data.permissions;
						});
					}
				}
			);
		}

		$rootScope.fields = {selected: null};

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

	app.controller('AssetPropertiesController', ['$scope','$rootScope','DataManager', function($scope,$rootScope)
	{
		$scope.new = {};

		$scope.$watch('fields.selected', function(newval){
			$scope.selected = $scope.assets && newval ? $scope.assets[newval] : $scope.new;
		});
				
		$scope.markDirty = function(id){
			$scope.assets[id]._dirty = true;
		}

		$scope.markClean = function(id){
			$scope.assets[id]._dirty = false;
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
