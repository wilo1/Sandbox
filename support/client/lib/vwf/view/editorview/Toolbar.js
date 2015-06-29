
define(['vwf/view/editorview/angular-app'], function(app)
{
	app.directive('dragScroll', function()
	{
		return {
			restrict: 'A',
			link: function(scope, elem, attrs)
			{
				/* Mouse dragg scroll */
				var x, y, top, left, down, moved;

				elem.attr("onselectstart", "return false;"); // Disable text selection in IE8

				elem.mousedown(function(e) {
					e.preventDefault();
					down = true;
					x = e.pageX;
					y = e.pageY;
					top = $(this).scrollTop();
					left = $(this).scrollLeft();
				});

				elem.mouseleave(function(e) {
					down = false;
				});

				$(document.body).mousemove(function(e) {
					if (down) {
						var newX = e.pageX;
						var newY = e.pageY;
						elem.scrollTop(top - newY + y);
						elem.scrollLeft(left - newX + x);
					}
				});
				$(document.body).mouseup(function(e) {
					if (down) {
						e.preventDefault();
						e.stopImmediatePropagation();
						down = false;
						return false;
					}
				});
			}
		};
	});

	app.directive('toolbarSelect', function(){
		return {
			restrict: 'A',
			scope: {
				setFn: '&toolbarSelect'
			},
			link: function(scope, elem, attrs)
			{
				elem.click(function(){
					scope.setFn();
				});
			}
		};
	});

	app.controller('ToolbarController', ['$scope', function($scope)
	{
		$scope.xfSelected = 'move';
		$scope.spaceSelected = 'local';
		$scope.cameraSelected = 'orbit';

		$scope.triggerMenu = function(menuId)
		{
			$('#' + menuId).click();
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
		}
	}]);

	return {
		initialize: function()
		{
			$('#toolbar').show();
		}
	};
});
