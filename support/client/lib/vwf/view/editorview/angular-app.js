define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('SandboxEditor', []);
	var rootScope;

	app.run(['$rootScope', function($rootScope)
	{
		rootScope = $rootScope;
		$rootScope.fields = {};

		$(document).on('selectionChanged', function(e,node){
			$rootScope.fields.selectedNode = node;
			$rootScope.$apply();
		});
	}]);

	return {
		app: app,
		initialize: function(){
			angular.bootstrap( document.body, ['SandboxEditor'] );
		},
		calledMethod: function(id, evtname, data)
		{
			//console.log('Called method', id, evtname);
			if( id === 'index-vwf' && evtname === 'ready' ){
				rootScope.fields.worldIsReady = true;
				rootScope.$apply();
			}
		}
	}
});
