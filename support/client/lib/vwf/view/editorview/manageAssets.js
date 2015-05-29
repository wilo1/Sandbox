define(['vwf/view/editorview/lib/angular', 'vwf/view/editorview/lib/angular-resource'], function(angular)
{
	return {
		initialize: function()
		{



			var app = angular.module('ManageAssetsDialog', ['ngResource']);

			app.factory('DataManager', ['$resource','$http', function($resource,$http)
			{
				var listResource = $resource('/adl/sas/assets/by-meta/all-of?user_name=:userId&isSandboxAsset=true');
				var data = listResource.get({userId: 'vergenzs'}, function(list)
				{
					for(var id in list.matches)
					{
						$http.get('/adl/sas/assets/'+id+'/meta/name').success(function(data){
							list.matches[id].name = data;
						});;
					}
				});


				return data;
			}]);

			app.controller('AssetListController', ['$scope','$rootScope','DataManager', function($scope,$rootScope,DataManager)
			{
				$scope.data = DataManager;
			}]);





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
		}
	};
	
});
