define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('SandboxEditor', []);

	app.run(['$rootScope', function($rootScope)
	{
		app.root = $rootScope;
		$rootScope.fields = {};

		$(document).on('selectionChanged', function(e,node){
			$rootScope.fields.selectedNode = node;
			$rootScope.$apply();
		});

		$(document).on('setstatecomplete', function(){
			$rootScope.fields.worldIsReady = true;
			$rootScope.$apply();
		});
	}]);

	app.initialize = function(){
		angular.bootstrap( document.body, ['SandboxEditor'] );
	};

	app.calledMethod = function(id, evt, data)
	{
		
	};

	return app;
});
