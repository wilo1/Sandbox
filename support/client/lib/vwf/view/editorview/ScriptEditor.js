'use strict';

define(['vwf/view/editorview/angular-app'], function(app)
{
	$(document.head).append('<script src="../vwf/view/editorview/lib/ace/ace.js" type="text/javascript" charset="utf-8"></script>');

	var methodSuggestions = [
		{
			name: 'attached',
			value: {
				parameters: [],
				body: [
					"// attached is called when the object is hooked up to the scene.",
					"// Note that this happens after initialize. At this point, you can access the objects parent."
				].join('\n')
			}
		}, {
			name: 'collision',
			value: {
				parameters: ['obstacle', 'data'],
				body: '// The body has collided with another body. The ID of the node is param 1, collision data in param 2'
			}
		}, {
			name: 'deinitialize',
			value: {
				parameters: [],
				body: [
					"// Deinitialize is called when the object is being destroyed.",
					"// Clean up here if your object allocated any resources manually during initialize."
				].join('\n')
			}
		}, {
			name: 'initialize',
			value: {
				parameters: [],
				body: [
					"// Initialize is called when the node is constructed.",
					"// Write code here to setup the object, or hook up event handlers.",
					"// Note that the object is not yet hooked into the scene - that will happen during the 'Added' event.",
					"// You cannot access this.parent in this function."
				].join('\n')
			}
		}, {
			name: 'prerender',
			value: {
				parameters: [],
				body: [
					"// This function is called at every frame. Don't animate object properties here - that can break syncronization.",
					"// This can happen because each user might have a different framerate.",
					"// Most of the time, you should probably be using Tick instead."
				].join('\n')
			}
		}, {
			name: 'ready',
			value: {
				parameters: [],
				body: '// The scene is now completely loaded. This will fire on each client when the client joins, so it`s not a great place to create objects'
			}
		}, {
			name: 'tick',
			value: {
				parameters: [],
				body: [
					"// The tick function is called 20 times every second.",
					"// Write code here to animate over time"
				].join('\n')
			}
		}
	];

	var eventSuggestions = [
		{
			name: 'pointerClick',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerDown',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerMove',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerOut',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerOver',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerUp',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
		{
			name: 'pointerWheel',
			value: {
				parameters: ['eventData','nodeData'],
				body: 'console.log("got here");'
			}
		},
	];

	/*****************************************************************************
	 * aceCodeEditor directive
	 * All of the text editor code is here
	 ****************************************************************************/

	app.directive('aceCodeEditor', function()
	{
		return {
			restrict: 'E',
			scope: true,
			template: '<pre></pre>',
			link: function($scope,elem,attrs)
			{
				var editor = ace.edit(elem.children()[0]);
				editor.setTheme("ace/theme/monokai");
				editor.setShowPrintMargin(false);
				editor.resize();
				elem[0]._editor = editor;
				_ScriptEditor._editor = editor;

				$scope.$watch(attrs.disabled, function(newval){
					editor.setReadOnly(!!newval);
					$('.ace_content', elem).css('opacity', newval ? 0.3 : 1);
				});

				$(document).on('viewportresize', function(e){
					editor.resize();
				});

				editor.on('change', function(){
					$scope.dirty[$scope.selectedField.id] = true;
					$scope.$apply();
				});

				$scope.sessions = {};

				$scope.$watchGroup(['selectedField','dirty[selectedField.id]'], function(newvals)
				{
					if(newvals[0])
					{
						if( !$scope.sessions[newvals[0].id] || !newvals[1] ){
							regenerateBody(newvals[0]);
						}

						editor.setSession( $scope.sessions[newvals[0].id] );
						editor.clearSelection();
					}
					else {
						editor.setSession( ace.createEditSession('') );
					}
				});

				function regenerateBody(item)
				{
					var newBody = '';
					if( /^(methods|events)$/.test($scope.guiState.openTab) ){
						var fullBody = 'function '+item.name+'('+item.value.parameters.join(',')+')\n'
							+'{\n'
							+item.value.body
							+'\n}';
						newBody = $.trim(js_beautify(fullBody, {
							max_preserve_newlines: 2,
							braces_on_own_line: true,
							opt_keep_array_indentation: true
						}));
					}
					else if( $scope.guiState.openTab === 'properties' ){
						newBody = angular.toJson(item.value, 4);
					}

					$scope.sessions[item.id] = ace.createEditSession(newBody);

					if( $scope.guiState.openTab === 'properties' )
						$scope.sessions[item.id].setMode("ace/mode/json");
					else
						$scope.sessions[item.id].setMode("ace/mode/javascript");
				}

				$('textarea.ace_text-input', elem).keydown(function(e)
				{
					// implement ctrl-s to save
					if(e.which == 83 && e.ctrlKey == true)
					{
						e.preventDefault();
						$scope.save();
					}

					// trigger autocomplete
					/*else if(e.which == 32 && e.ctrlKey == true)
					{
						e.preventDefault();

						var cur = editor.getCursorPosition();
						var session = editor.getSession();
						var line = session.getLine(cur.row);

						line = /[^\s;(),!]*$/.exec(line)[0];

						var triggerkeyloc = Math.max(line.lastIndexOf('.'), line.lastIndexOf('['));
						var triggerkey = line[triggerkeyloc];
						var filter = line.substr(triggerkeyloc + 1);
						line = line.substring(0, triggerkeyloc);
						line = line || 'window';
						triggerkey = triggerkey || '.';
						//Don't show for lines that have ( or ) (other than the one that triggered the autocomplete) because function calls
						//might have side effects
						if (line.indexOf('(') == -1 && line.indexOf('=') == -1) {
							self.beginAutoComplete(editor, triggerkey, line, filter);
						}
					}*/

				});

			}
		};
	});

	/***************************************************************************
	 * ScriptEditorController
	 * All the business logic, and some of the presentation logic, used to
	 * drive the script editor is found here.
	 **************************************************************************/

	app.controller('ScriptEditorController', ['$scope','$timeout', function($scope, $timeout)
	{
		/*
		 * All variables specific to this scope
		 *
		 */

		window._ScriptEditor = $scope;

		$scope.guiState = {
			openTab: '',
			showHiddenProperties: false,
			inheritPrototype: false
		};

		$scope.dirty = {};

		var methodsDirty = false, eventsDirty = false, propertiesDirty = false, timeoutSet = false;

		$scope.methodList = [];
		$scope.methodList.selected = '';
		$scope.eventList = [];
		$scope.eventList.selected = '';
		$scope.propertyList = [];
		$scope.propertyList.selected = '';

		$scope.currentList = [];

		/*
		 * All watchers, most of them synchronizing derived values
		 *
		 * Summary of relevant root-scope values:
		 * 	fields.selectedNode:
		 * 		The selected VWF editor node, as determined by _Editor.GetSelectedVWFNode(), and as updated by
		 * 		the 'selectionChanged' event and the VWF events created/deletedMethod, created/deletedEvent,
		 * 		initialized/created/satProperty
		 *
		 * Summary of derived values:
		 *	methodList:
		 *		A sorted array version of fields.selectedNode.methods, with an additional 'selected' property
		 *	eventList:
		 *		A sorted array version of fields.selectedNode.events, with an additional 'selected' property
		 *	propertyList:
		 *		A sorted array version of fields.selectedNode.properties, with an additional 'selected' property
		 * 	currentList:
		 * 		Either methodList, eventList, or propertyList, as determined by the currently open tab
		 *	currentSuggestions:
		 *		A sorted list of pseudo-methods/events. Used for the grey items in the method/event list
		 *	selectedField:
		 *		The method, event, or property currently being viewed/edited, as determined by currentList.selected
		 */

		$scope.$watchGroup(['guiState.openTab','methodList','eventList','propertyList'], function(newvals)
		{
			switch(newvals[0])
			{
				case 'methods':
					$scope.currentList = newvals[1];
					$scope.currentSuggestions = methodSuggestions;
				break;
			
				case 'events':
					$scope.currentList = newvals[2];
					$scope.currentSuggestions = eventSuggestions;
				break;

				case 'properties':
					$scope.currentList = newvals[3];
					$scope.currentSuggestions = [];
				break;

				default:
					$scope.currentList = [];
					$scope.currentList.selected = '';
					$scope.currentSuggestions = [];
				break;
			}
		});

		$scope.$watchGroup(['currentList','currentList.selected'], function(newvals)
		{
			if( newvals[0] )
			{
				$scope.selectedField = 
					newvals[0].reduce(function(old,cur){ return cur.name === newvals[1] ? cur : old; }, null)
					||
					$scope.currentSuggestions.reduce(function(old,cur){ return cur.name === newvals[1] ? cur : old; }, null);

				if( $scope.selectedField && !$scope.selectedField.id ){
					$scope.selectedField.id = [$scope.fields.selectedNode.id, $scope.guiState.openTab, newvals[1]].join('_');
				}
			}
			else {
				$scope.selectedField = null;
			}
		});

		$scope.$watch('fields.selectedNode', function(){
			$scope.methodList.selected = $scope.eventList.selected = $scope.propertyList.selected = null;
		});

		$scope.$watch('guiState.inheritPrototype', function(newval){
			$scope.rebuildLists();
		});

		$scope.$watchCollection('fields.selectedNode.methods', function(){
			console.log('methods updated');
			methodsDirty = true;
			if(!timeoutSet){
				timeoutSet = $timeout(function(){
					$scope.rebuildLists();
					methodsDirty = eventsDirty = propertiesDirty = timeoutSet = false;
				});
			}
		});

		$scope.$watchCollection('fields.selectedNode.events', function(){
			console.log('events updated');
			eventsDirty = true;
			if(!timeoutSet){
				timeoutSet = $timeout(function(){
					$scope.rebuildLists();
					methodsDirty = eventsDirty = propertiesDirty = timeoutSet = false;
				});
			}
		});

		$scope.$watchCollection('fields.selectedNode.properties', function(){
			console.log('properties updated');
			propertiesDirty = true;
			if(!timeoutSet){
				timeoutSet = $timeout(function(){
					$scope.rebuildLists();
					methodsDirty = eventsDirty = propertiesDirty = timeoutSet = false;
				});
			}
		});

		// Life would be easier if currentList could be an object, but alas.
		// This function does a name lookup on the given list.
		$scope.hasField = function(name, list){
			return list.reduce(
				function(old,val){ return old || val.name === name; },
				false
			);
		}

		$scope.hasFieldFilter = function(item){
			return !$scope.hasField(item.name, $scope.currentList);
		}

		// This method regenerates the field lists as needed from the selected node's
		// "methods", "events", and "properties" objects. Used by the watchers of those
		// objects above
		$scope.rebuildLists = function()
		{
			var oldMethods = $scope.methodList,
				oldEvents = $scope.eventList,
				oldProperties = $scope.propertyList;

			if( methodsDirty ){
				$scope.methodList = [];
				$scope.methodList.selected = oldMethods.selected;
			}

			if( eventsDirty ){
				$scope.eventList = [];
				$scope.eventList.selected = oldEvents.selected;
			}

			if( propertiesDirty ){
				$scope.propertyList = [];
				$scope.propertyList.selected = oldProperties.selected;
			}

			if( !$scope.fields.selectedNode ){
				$scope.guiState.openTab = '';
				return;
			}
			else if( !$scope.guiState.openTab ){
				$scope.guiState.openTab = 'methods';
			}

			// populate lists
			var curNode = $scope.fields.selectedNode;
			while(curNode)
			{
				if( methodsDirty ){
					for(var i in curNode.methods){
						if( !$scope.hasField(i, $scope.methodList) )
							$scope.methodList.push({'name': i, 'id': curNode.id+'_methods_'+i, 'value': curNode.methods[i]});
					}
				}

				if( eventsDirty ){
					for(var i in curNode.events){
						if( !$scope.hasField(i, $scope.eventList) )
							$scope.eventList.push({'name': i, 'id': curNode.id+'_events_'+i, 'value': curNode.events[i]});
					}
				}

				if( propertiesDirty ){
					for(var i in curNode.properties){
						if( !$scope.hasField(i, $scope.propertyList) )
							$scope.propertyList.push({'name': i, 'id': curNode.id+'_properties_'+i, 'value': curNode.properties[i]});
					}
				}

				if($scope.guiState.inheritPrototype)
					curNode = _Editor.getNode(vwf.prototype(curNode.id), true);
				else
					break;
			}

			function sortByName(a,b){
				return a.name > b.name ? 1 : -1;
			};
			$scope.methodList.sort(sortByName);
			$scope.eventList.sort(sortByName);
			$scope.propertyList.sort(sortByName);

		}

		// simple string formatting
		$scope.getSingular = function(tabname)
		{
			switch(tabname){
				case 'methods': return 'Method';
				case 'events': return 'Event';
				case 'properties': return 'Property';
				default: return 'Method';
			}
		}

		// determine if the session is capable of editing scripts
		function checkPermission()
		{
			if (!_UserManager.GetCurrentUserName()) {
				_Notifier.notify('You must log in to edit scripts');
				return false;
			}

			if( !$scope.fields.selectedNode ){
				return false;
			}

			if (_PermissionsManager.getPermission(_UserManager.GetCurrentUserName(), $scope.fields.selectedNode.id) == 0) {
				_Notifier.notify('You do not have permission to script this object');
				return false;
			}
			return true;
		}

		// determine if Ace has detected any syntax errors in the current code window
		$scope.checkSyntax = function(dialog)
		{
			var editor = document.querySelector('ace-code-editor')._editor;
			var s = editor.getSession().getAnnotations();
			var errors = "";
			for (var i = 0; i < s.length; i++) {
				if (s[i].type == 'error') errors += "<br/> line: " + s[i].row + "-" + s[i].text;
			}
			if (errors != "") {
				alertify.alert('This script contains syntax errors, and cannot be saved. The errors are: \n' + errors.toString());

				return false;
			}

			if(dialog){
				alertify.alert('This script contains no syntax errors.');
			}

			return true;
		}

		// The 'Save Method/Event/Property' click handler
		$scope.save = function()
		{
			if( checkPermission() && $scope.checkSyntax() && $scope.dirty[$scope.selectedField.id] && $scope.fields.selectedNode.id !== 'index-vwf' )
			{
				var editor = document.querySelector('ace-code-editor')._editor;

				var fieldName = $.trim($scope.selectedField.name);
				var rawtext = editor.getValue();

				if( /^(?:methods|events)$/.test($scope.guiState.openTab) )
				{
					var params = rawtext.substring(rawtext.indexOf('(') + 1, rawtext.indexOf(')'));
					params = params.split(',');
					var cleanParams = [];

					for (var i = 0; i < params.length; i++) {
						params[i] = $.trim(params[i]);
						if (params[i] != '' && params[i] != null && params[i] !== undefined)
							cleanParams.push(params[i]);
					}

					var body = rawtext.substring(rawtext.indexOf('{') + 1, rawtext.lastIndexOf('}'));
					body = $.trim(body);

					if( $scope.guiState.openTab === 'methods' )
					{
						if( $scope.fields.selectedNode.methods && $scope.fields.selectedNode.methods[fieldName] ){
							vwf_view.kernel.deleteMethod($scope.fields.selectedNode.id, fieldName);
						}

						vwf_view.kernel.createMethod($scope.fields.selectedNode.id, fieldName, cleanParams, body);
					}
					else
					{
						if( $scope.fields.selectedNode.events && $scope.fields.selectedNode.events[fieldName] ){
							vwf_view.kernel.deleteEvent($scope.fields.selectedNode.id, fieldName);
						}

						vwf_view.kernel.createEvent($scope.fields.selectedNode.id, fieldName, cleanParams, body);
					}
				}
				else if( $scope.guiState.openTab === 'properties' )
				{
					try {
						var val = JSON.parse(rawtext);
					}
					catch(e){
						val = rawtext;
					}

					if( $scope.fields.selectedNode.properties && $scope.fields.selectedNode.properties[fieldName] !== undefined ){
						vwf_view.kernel.setProperty($scope.fields.selectedNode.id, fieldName, val);
					}
					else {
						vwf_view.kernel.createProperty($scope.fields.selectedNode.id, fieldName, val);
					}
				}

				//$timeout(function(){
					$scope.dirty[$scope.selectedField.id] = false;
				//});
			}
		}

		// The 'Discard Changes' click handler
		$scope.discard = function()
		{
			alertify.confirm('Are you SURE you want to discard your unsaved changes?', function(ok){
				if(ok){
					$scope.dirty[$scope.selectedField.id] = false;
					$scope.$apply();
				}
			});
		}

		// The 'Call Method/Event' click handler
		$scope.call = function()
		{
			var map = {
				'methods': vwf_view.kernel.callMethod.bind(vwf_view.kernel),
				'events': vwf_view.kernel.fireEvent.bind(vwf_view.kernel)
			};

			map[ $scope.guiState.openTab ]($scope.fields.selectedNode.id, $scope.currentList.selected);
		}

		// The 'Delete Method/Event' click handler
		$scope.delete = function()
		{
			if( checkPermission() )
			{
				var map = {
					'methods': vwf_view.kernel.deleteMethod.bind(vwf_view.kernel),
					'events': vwf_view.kernel.deleteEvent.bind(vwf_view.kernel)
				};

				alertify.confirm('Are you SURE you want to delete the "'+$scope.currentList.selected+'" '+$scope.getSingular($scope.guiState.openTab).toLowerCase()+'?',
					function(ok){
						if(ok){
							map[ $scope.guiState.openTab ]($scope.fields.selectedNode.id, $scope.currentList.selected);
							$scope.currentList.selected = '';
						}
					}
				);
			}
		}

		// The 'New Method/Event/Property' click handler
		$scope.new = function()
		{
			var idRE = /^\w+$/;
			var type = $scope.getSingular($scope.guiState.openTab).toLowerCase();
			if( checkPermission() )
			{
				alertify.prompt('What is the new '+type+' called?', function(e, name)
				{
					if( !idRE.test(name) ){
						alertify.alert('That name is invalid!');
					}
					else if( $scope.hasField(name, $scope.propertyList) ){
						alertify.alert('There is already a'+(type[0]==='e'?'n ':' ')+type+' by that name!');
					}
					else if( $scope.guiState.openTab === 'methods')
					{
						vwf_view.kernel.createMethod($scope.fields.selectedNode.id, name, [], 'console.log("got here");');
						$scope.methodList.selected = name;
					}
					else if( $scope.guiState.openTab === 'events')
					{
						vwf_view.kernel.createEvent($scope.fields.selectedNode.id, name, ['eventData','nodeData'], 'console.log("got here");');
						$scope.eventList.selected = name;
					}
					else if( $scope.guiState.openTab === 'properties' )
					{
						vwf_view.kernel.createProperty($scope.fields.selectedNode.id, name, '');
						$scope.propertyList.selected = name;
					}
				});
			}
		}

		/*
		 * Manage the visibility state of the script editor
		 */

		$scope.isOpen = function(){
			return !! parseInt($('#ScriptEditor').css('height'));
		}

		$scope.show = function(){
			$('#ScriptEditor').removeClass('minimized');
		}
		$scope.hide = function(){
			if($scope.maximized){
				$scope.unmaximize();
			}
			$('#ScriptEditor').addClass('minimized');
		}

		$scope.maximized = false;
		$scope.maximize = function(){
			$('#vwf-root').hide();
			$('#ScriptEditor').addClass('maximized');
			$scope.maximized = true;
		}
		$scope.unmaximize = function(){
			$('#vwf-root').show();
			$('#ScriptEditor').removeClass('maximized');
			$scope.maximized = false;
		}

	}]);

	return {
		initialize: function()
		{

		}
	};
});



/**********************************************************************
 * Everything below this point is legacy unused code, but might be
 * useful as a guide later, once we reimplement autocomplete.
 *********************************************************************/

var oldDefine = function() {

	function initialize() {
		

		var self = this;
		//show the little popup that displays the parameters to a function call
		this.setupFunctionTip = function(text, editor, offset, width) {


			if ($('#FunctionTip').length == 0) {
				$(document.body).append("<form id='FunctionTip' />");
			}
			$('#FunctionTip').text(text);
			$('#FunctionTip').css('top', (offset.top - $('#FunctionTip').height()) + 'px');
			$('#FunctionTip').css('left', (offset.left) + 'px');
			$('#FunctionTip').show();
		}
		this.insetKeySuggestion = function(suggestedText) {
				$('#AutoComplete').hide();
				if (suggestedText != "") {
					//backspace letters up to the dot or bracket
					for (var i = 0; i < self.filter.length; i++)
						_ScriptEditor.activeEditor.remove('left');
					//insert
					var isfunction = false;
					for (var i = 0; i < self.keys.length; i++)
						if (self.keys[i][0] == suggestedText && self.keys[i][1] == Function) isfunction = true;


					if (self.autoCompleteTriggerKey == '[') {

						suggestedText = suggestedText + "]";
					}

					if (isfunction) {
						suggestedText = suggestedText + "(";
						//focus on the editor
						window.setImmediate(function() {
							_ScriptEditor.activeEditor.focus();
							self.triggerFunctionTip(_ScriptEditor.activeEditor, true);
						}, 0);
					} else {
						window.setImmediate(function() {
							_ScriptEditor.activeEditor.focus();
						}, 0);
					}

					_ScriptEditor.activeEditor.insert(suggestedText);
				}


			}
			//Setup the div for the autocomplete interface
		this.setupAutocomplete = function(keys, editor) {
				this.activeEditor = editor;
				if (!self.filter)
					self.filter = '';

				//Get the position of hte cursor on the editor			
				var offset = $(editor.renderer.$cursorLayer.cursor).offset();
				var width = $(editor.renderer.$cursorLayer.cursor).width();
				if ($('#AutoComplete').length == 0) {
					//append the div and create it
					$(document.body).append("<form id='AutoComplete' tabindex=890483 />");

					$('#AutoComplete').on('blur', function(e, key) {
						//there is some sort of error here, this prevention is a workaround. 
						//seems to get a blur event only on first show
						if (!this.firstshow) {
							this.firstshow = true;

						} else {
							$('#AutoComplete').hide();
						}

					});
					//bind up events
					$('#AutoComplete').on('keydown', function(e, key) {
						//enter or dot will accept the suggestion
						if (e.which == 13 || e.which == 190 || e.which == 39) {
							//find the selected text
							var index = $(this).attr('autocompleteindex');



							var text = $($(this).children()[index]).text();

							_ScriptEditor.insetKeySuggestion(text);
							return true;


						} else if (e.which == 40) //down
						{
							//move up or down the list
							var children = $(this).children();
							var index = $(this).attr('autocompleteindex');
							index++;
							if (index > children.length - 1)
								index = children.length - 1;
							$(this).attr('autocompleteindex', index);

							//deal with the scrolling

							$('#AutoComplete').scrollTop((index) * $(children[0]).height() + index - 75);

							//show the selection
							for (var i = 0; i < children.length; i++) {
								if (i == index) {
									$(children[i]).css('background', 'rgb(90, 180, 230)');
								} else
									$(children[i]).css('background', '');
							}
							e.preventDefault();
							return false;
						} else if (e.which == 38) //up
						{
							//move up or down the list
							var children = $(this).children();
							var index = $(this).attr('autocompleteindex');
							index--;
							if (index < 0)
								index = 0;
							$(this).attr('autocompleteindex', index);

							//deal with scrolling drama
							$('#AutoComplete').scrollTop((index) * $(children[0]).height() + index - 75);


							//show the selected text
							for (var i = 0; i < children.length; i++) {
								if (i == index) {
									$(children[i]).css('background', 'rgb(90, 180, 230)');
								} else
									$(children[i]).css('background', '');
							}
							e.preventDefault();
							return false;
						} else if (e.which == 27) //esc
						{
							//just hide the editor
							$('#AutoComplete').hide();
							_ScriptEditor.activeEditor.focus();

						} else if (e.which == 16) //esc
						{
							//do nothing for shift

						} else {
							//this is all other keys, 
							var key = e.which;
							key = String.fromCharCode(key);

							//if the key is a character or backspace, edit the filter
							if (e.which == 8 || (e.which < 91 && e.which > 64) || e.which == 189) {
								//if it's not a backspace, add it to the filter
								if (e.which != 8 && e.which != 189)
									self.filter += key;
								else if (e.which == 189)
									self.filter += '_';
								else { //if the backspace occurs with no filter, then close and remove
									if (self.filter.length == 0) {
										window.setImmediate(function() {
											_ScriptEditor.activeEditor.remove('left');
											$('#AutoComplete').hide();
											_ScriptEditor.activeEditor.focus();

										}, 0);
										e.preventDefault();
										return;
									}
									//else, backspace from both the editor and the filter string
									self.filter = self.filter.substr(0, self.filter.length - 1);
									_ScriptEditor.activeEditor.remove('left');

								}
								//wait 15ms, then show this whole dialog again
								window.setImmediate(function() {
									//console.log(self.filter);
									$('#AutoComplete').focus();

									self.setupAutocomplete(self.keys, _ScriptEditor.activeEditor, self.filter);

								}, 0);
							} else {
								//any key that is not a character or backspace cancels the autocomplete
								window.setImmediate(function() {
									$('#AutoComplete').hide();
									_ScriptEditor.activeEditor.focus();

								}, 0);

							}
							//this is important for keypresses, so that they will filter down into ACE
							_ScriptEditor.activeEditor.focus();

						}

					});

				}


				//now that the gui is setup, populate it with the keys
				$('#AutoComplete').empty();
				var first = false;
				for (var i in self.keys) {
					//use the filter string to filter out suggestions
					if (self.keys[i][0].toLowerCase().indexOf(self.filter.toLowerCase()) != 0)
						continue;

					//Append a div	
					$('#AutoComplete').append("<div id='AutoComplete_" + i + "' class='AutoCompleteOption'/>");
					$('#AutoComplete_' + i).text(self.keys[i][0]);
					if (self.keys[i][1] == Function) {
						$('#AutoComplete_' + i).addClass('AutoCompleteOptionFunction');
					}
					$('#AutoComplete_' + i).attr('autocompleteindex', i);
					if (!first)
						$('#AutoComplete_' + i).css('background', 'lightblue');
					first = true;

					//Clicking on the div just inserts the text, and hides the GUI
					$('#AutoComplete_' + i).click(function() {
						var text = $(this).text();
						_ScriptEditor.insetKeySuggestion(text);
						return true;

					});
				}
				$('#AutoComplete').focus();

				$('#AutoComplete').css('top', offset.top + 'px');
				$('#AutoComplete').css('left', (offset.left + width) + 'px');

				$('#AutoComplete').css('max-height', Math.min(150, ($(window).height() - offset.top)) + 'px');
				$('#AutoComplete').show();
				$('#AutoComplete').attr('autocompleteindex', 0);
				$('#AutoComplete').css('overflow', 'hidden');
				$('#AutoComplete').scrollTop(0);
				//this is annoying. Why?
				$(document.body).scrollTop(0);
				window.setImmediate(function() {
					$('#AutoComplete').focus();

				}, 0);
			}
			// a list of idenifiers to always ignore in the autocomplete
		this.ignoreKeys = ["defineProperty"];
		this.beginAutoComplete = function(editor, chr, line, filter) {


				//get the keys
				self.keys = vwf.callMethod(self.currentNode.id, 'JavascriptEvalKeys', [line]);



				if (self.keys) {

					//first, remove from the list all keys beginning with "___" and the set list of ignoreable keys
					var i = 0;
					if (!_ScriptEditor.showHiddenProperties) {
						while (i < self.keys.length) {
							if (self.keys[i][0].search(/^___/) != -1) {
								self.keys.splice(i, 1);
							} else {
								i++;
							}
						}

						i = 0;

						while (i < self.keys.length) {
							for (var j = 0; j < self.ignoreKeys.length; j++) {
								if (self.keys[i][0] == self.ignoreKeys[j]) {
									self.keys.splice(i, 1);
									break;
								}
							}
							i++;
						}
					}
					this.autoCompleteTriggerKey = chr;
					//if the character that started the autocomplete is a dot, then remove the keys that have
					//spaces or special characters, as they are not valid identifiers
					if (chr == '.') {
						var remove = [];
						var i = 0;

						while (i < self.keys.length) {
							if (self.keys[i][0].search(/[^0-9a-zA-Z_]/) != -1 || self.keys[i][0].search(/[0-9]/) == 0) {
								self.keys.splice(i, 1);
							} else {
								i++;
							}
						}


					} else {
						//if the character was a bracket, suround the key with quotes
						for (var i = 0; i < self.keys.length; i++) {
							if (self.keys[i][0].search(/[^0-9]/) != -1) {
								self.keys[i][0] = '"' + self.keys[i][0] + '"';
							}
						}
					}

					//sort the keys by name
					self.keys.sort(function(a, b) {
						return a[0] > b[0] ? 1 : -1;
					})
					window.setImmediate(function() {
						self.filter = filter;
						self.setupAutocomplete(self.keys, editor, filter);

					}, 0);

				}


			}
			//The dot or the bracket was hit, so open the suggestion box
		this.triggerAutoComplete = function(editor) {
				var cur = editor.getCursorPosition();
				var session = editor.getSession();
				var line = session.getLine(cur.row);
				var chr = line[cur.column];

				//Open on . or [
				if (chr == '.' || chr == '[') {

					//get the line up to the dot
					line = line.substr(0, cur.column);
					line = self.filterLine(line);
					//don't show autocomplete for lines that contain a (, because we'll be calling a functio ntaht might have side effects
					if (line.indexOf('(') == -1 && line.indexOf('=') == -1) {
						this.beginAutoComplete(editor, chr, line, '');
					}

				}

			}
			//Test for an open paren, then show the parameter help
		this.triggerFunctionTip = function(editor, inserted) {
			var cur = editor.getCursorPosition();
			var session = editor.getSession();
			var line = session.getLine(cur.row);
			//Only show for open paren

			if (line[cur.column] == '(' || (inserted && line[cur.column - 1] == '(')) {

				//Get the line
				line = line.substr(0, cur.column);
				var splits = line.split(' ');
				line = splits[splits.length - 1];
				splits = line.split(';');
				line = splits[splits.length - 1];
				//Don't show for lines that have ( or ) (other than the one that triggered the autocomplete) because function calls
				//might have side effects

				if (inserted && line.indexOf('(') == line.length - 1) {
					line = line.substring(0, line.length - 1);
				}

				if (line.indexOf('(') == -1 && line.indexOf('=') == -1) {
					//Get the text for the tooltip
					var text = vwf.callMethod(self.currentNode.id, 'JavascriptEvalFunction', [line]);


					if (text) {
						window.setImmediate(function() {
							self.setupFunctionTip(text, editor, $(editor.renderer.$cursorLayer.cursor).offset(), $(editor.renderer.$cursorLayer.cursor).width());

						}, 0);

					}

				}

			}

		}

		//route change events to check for autocomplete
		this.methodEditor.getSession().on('change', function(e) {
			self.MethodChange();
			self.triggerAutoComplete(self.methodEditor);
			self.triggerFunctionTip(self.methodEditor);
		});


		this.methodEditor.setPrintMarginColumn(false);
		this.methodEditor.setFontSize('15px');
		this.methodEditor.keyBinding.origOnCommandKey = this.methodEditor.keyBinding.onCommandKey;


		//hide or show the function top based on the inputs
		this.methodEditor.on('change', function(e) {

			//hide if removing an open paren
			if (e.data.action == "removeText") {
				if (e.data.text.indexOf('(') != -1)
					$('#FunctionTip').hide();

			}
			//hide if inserting a close paren
			if (e.data.action == "insertText") {
				if (e.data.text.indexOf(')') != -1)
					$('#FunctionTip').hide();

			}

			var cur = self.methodEditor.getCursorPosition();
			var session = self.methodEditor.getSession();
			var line = session.getLine(cur.row);
			var chr1 = line[cur.column - 1];
			var chr2 = line[cur.column];

			if (chr2 == ')')
				$('#FunctionTip').hide();

		});

		//hide or show the function top based on the inputs
		this.methodEditor.keyBinding.onCommandKey = function(e, hashId, keyCode) {

				var cur = self.methodEditor.getCursorPosition();
				var session = self.methodEditor.getSession();
				var line = session.getLine(cur.row);
				var chr1 = line[cur.column - 1];
				var chr2 = line[cur.column];

				//hide on up or down arrow	
				if (keyCode == 38 || keyCode == 40)
					$('#FunctionTip').hide();
				//hide when moving cursor beyond start of (
				if (keyCode == 37) {
					if (chr1 == '(')
						$('#FunctionTip').hide();
				}
				//hide when moving cursor beyond end of )
				if (keyCode == 39) {
					if (chr2 == ')')
						$('#FunctionTip').hide();
				}
				this.origOnCommandKey(e, hashId, keyCode);

			}

		this.filterLine = function(line) {

			var splits = line.split(' ');
			line = splits[splits.length - 1];
			splits = line.split(';');
			line = splits[splits.length - 1];
			splits = line.split('(');
			line = splits[splits.length - 1];
			splits = line.split(')');
			line = splits[splits.length - 1];
			splits = line.split(',');
			line = splits[splits.length - 1];
			splits = line.split('!');
			line = splits[splits.length - 1];
			console.log(line);
			return line;

		}


		$('#methodtext').on('click', function() {
			$('#FunctionTip').hide();
		})
		$('#eventtext').on('click', function() {
			$('#FunctionTip').hide();
		})
		this.eventEditor.on('blur', function(e) {
			$('#FunctionTip').hide();
		});
		this.methodEditor.on('blur', function(e) {
			$('#FunctionTip').hide();
		});

		self.methodEditor.setBehavioursEnabled(false);
		self.eventEditor.setBehavioursEnabled(false);
		self.propertyEditor.setBehavioursEnabled(false);
	}
};
