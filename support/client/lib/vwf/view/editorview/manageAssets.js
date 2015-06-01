define(['vwf/view/editorview/lib/angular'], function(angular)
{
	return {
		initialize: function()
		{



			var app = angular.module('ManageAssetsDialog', []);

			app.factory('DataManager', ['$rootScope','$http', function($rootScope, $http)
			{
				$http.get('/adl/sas/assets/by-meta/all-of?user_name=vergenzs&isSandboxAsset=true').success(
					function(list)
					{
						$rootScope.assets = list.matches;

						for(var id in $rootScope.assets)
						{
							$http.get('/adl/sas/assets/'+id+'/meta/name').success(function(data){
								$rootScope.assets[id].name = data;
							});
						}
					}
				);

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
