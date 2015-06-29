define(['vwf/view/editorview/lib/angular'], function(angular)
{
	var app = angular.module('SandboxEditor', []);

	app.run(['$rootScope', function($rootScope)
	{
		$rootScope.fields = {};

		$(document).on('selectionChanged', function(e,node){
			$rootScope.fields.selectedNode = node;
			try {
				$rootScope.$apply();
			} catch(e){}
		});

		$(document).on('setstatecomplete', function(){
			$rootScope.fields.worldIsReady = true;
			try {
				$rootScope.$apply();
			} catch(e){}
		});
	}]);

	app.initialize = function(){
		angular.bootstrap( document.body, ['SandboxEditor'] );
	};

	return app;
});
