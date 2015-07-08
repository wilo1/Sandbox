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

	app.satProperty = function(id, prop, val)
	{
		if( app.root.fields.selectedNode && id === app.root.fields.selectedNode.id ){
			console.log('Property set:', prop, val);
			app.root.fields.selectedNode.properties[prop] = val;
			app.root.$apply();
		}
	}

	return app;
});
