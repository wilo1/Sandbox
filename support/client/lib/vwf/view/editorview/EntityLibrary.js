
define(['vwf/view/editorview/angular-app'], function(app)
{
	app.directive('vwsAccordion', function()
	{
		return {
			restrict: 'A',
			scope: {
				data: '=vwsAccordion'
			},
			link: function(scope, elem, attrs)
			{
				elem.accordion({header: 'h3', heightStyle: 'content'});

				scope.$watch('data', function(newval)
				{
					elem.accordion('refresh');
				}, true);

				elem.bind('$destroy', function(){
					elem.accordion('destroy');
				});
			}
		};
	});

	app.service('LibraryDataManager', ['$http', function($http)
	{
		var libraries = [];

		$http.get('./contentlibraries/libraries.json').success(function(libs)
		{
			for(var i=0; i<libs.length; i++)
			{
				libraries.push( {'name': libs[i].name} );

				(function(url, obj){
					$http.get(url).success(function(lib){
						obj.content = lib;
					});
				})(libs[i].url, libraries[libraries.length-1]);
			}
		});

		return libraries;
	}]);

	app.controller('EntityLibraryController', ['$scope','LibraryDataManager', function($scope, staticLibs)
	{
		window._EntityLibrary = $scope;

		$scope.staticLibs = staticLibs;

		$scope.isOpen = false;

		function sizeWindowTimer()
		{
			if (!_Editor.findcamera()) return;
			_Editor.findcamera().aspect = ($('#index-vwf').width() / $('#index-vwf').height());
			_Editor.findcamera().updateProjectionMatrix();
			_ScriptEditor.resize();

			if ($('#index-vwf').offset()) {
				$('#glyphOverlay').css('position', 'absolute');
				$('#glyphOverlay').css('left', $('#index-vwf').offset().left);
				$('#glyphOverlay').css('top', $('#index-vwf').offset().top);
			}
		}

		$scope.show = function() {

			$('#EntityLibrary').animate({
				'left': 0
			});
			var w = $(window).width() - 250 - ($(window).width() - getLeft('sidepanel',$(window).width()));
			$('#ScriptEditor').animate({
				'left': $('#EntityLibrary').width(),
				width: w
			}, {
				step: _ScriptEditor.resize
			});
			$('#index-vwf').animate({
				'left': $('#EntityLibrary').width(),
				width: w
			}, {
				step: sizeWindowTimer
			});

			$('#EntityLibraryAccordion').css('height', $('#index-vwf').css('height') - $('#entitylibrarytitle').height());
			$('#EntityLibrary').css('height', $('#index-vwf').css('height'));
			$('#EntityLibraryAccordion').css('overflow', 'auto');
			$scope.isOpen = true;
		}

		$scope.hide = function() {

			$('#EntityLibrary').animate({
				'left': -$('#EntityLibrary').width()
			});
			var w = $(window).width() - ($(window).width() - getLeft('sidepanel',$(window).width()));
			$('#ScriptEditor').animate({
				'left': 0,
				width: w
			}, {
				step: _ScriptEditor.resize
			});
			$('#index-vwf').animate({
				'left': 0,
				width: w
			}, {
				step: sizeWindowTimer
			});
			$scope.isOpen = false;
		}

		$scope.create = create;
	}]);

	var currentDrag = null;

	app.directive('draggableAsset', function()
	{
		return {
			restrict: 'A',
			scope: {
				asset: '=draggableAsset'
			},
			link: function(scope, elem, attrs)
			{
				attrs.$set('draggable', true);

				elem.on('dragstart', function(evt)
				{
					var dragIcon = document.createElement('img');
					dragIcon.src = '../vwf/view/editorview/images/icons/paste.png';
					dragIcon.width = 100;
					if(evt.originalEvent.dataTransfer.setDragImage)
						evt.originalEvent.dataTransfer.setDragImage(dragIcon, 10, 10);

					currentDrag = scope.asset;
					if(evt.originalEvent.dataTransfer.setData)
						evt.originalEvent.dataTransfer.setData('text', JSON.stringify(scope.asset));
					$(this).css('opacity', .5);
				});

				elem.on('dragend', function(){
					$(this).css('opacity', 1);
					currentDrag = null;
				});
			}
		};
	});

	function GetPick(evt)
	{
		var ray = _Editor.GetWorldPickRay(evt.originalEvent);
		var o = _Editor.getCameraPosition();
		var hit = _SceneManager.CPUPick(o, ray, {
			ignore: [_Editor.GetMoveGizmo()]
		});

		if(hit)
		{
			var object = hit.object;
			while (!object.vwfID && object.parent)
					object = object.parent;
			return object.vwfID;
		}
		else
			return null;
	}

	function toGMat(threemat)
	{
		var mat = [];
		for(var i=0; i<16; i++)
			mat[i] = threemat.elements[i];

		mat = (MATH.transposeMat4(mat));
		return mat;
	}

	function handleWorldDrop()
	{
		var dropPreview = null;

		var previewMaterial = new THREE.ShaderMaterial({
			uniforms: {},
			vertexShader: [
				"varying vec2 vUv;",
				"varying vec3 norm;",
				"varying vec3 tocam;",
				"void main()",
				"{",
				"vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );",
				"norm = (viewMatrix * vec4(normal,0.0)).xyz;",

				"vec3 vecPos = (modelMatrix * vec4(position, 1.0 )).xyz;",
				"norm = (modelMatrix * vec4(normal, 0.0)).xyz;",
				"tocam = vecPos.xyz - cameraPosition;",
				"gl_Position = projectionMatrix * mvPosition;",
				"}"
			].join('\n'),
			fragmentShader: [
				"varying vec3 norm;",
				"varying vec3 tocam;",
				"void main()",
				"{",
				"float d = 1.0-dot(normalize(norm),normalize(-tocam));",
				"d = pow(d,3.0);",
				"gl_FragColor = vec4(0.0,0.0,d,d);",
				"}"
			].join('\n'),
		});
		previewMaterial.transparent = true;
		previewMaterial.alphaTest = .8;
		previewMaterial.depthWrite = false;

		//when dragging into the 3d view, create a preview sphere, then try to attach the preview model
		$("#vwf-root").on('dragenter',"#index-vwf", function(evt)
		{
			var data = currentDrag;

			if (currentDrag && !dropPreview)
			{
				if (currentDrag.type == 'asset' || currentDrag.type == 'model')
				{
					dropPreview = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 30), previewMaterial);
					_dScene.add(dropPreview, true);

					if (data.dropPreview)
					{
						//the asset must have a 'drop preview' key
						window.assetRegistry.get(data.dropPreview.type, data.dropPreview.url, function(asset)
						{
							if (asset && dropPreview)
							{
								var transformNode = new THREE.Object3D();
								_RenderManager.addHilightObject(dropPreview)
								transformNode.matrixAutoUpdate = false;
								if (data.dropPreview.transform)
									transformNode.matrix.fromArray(data.dropPreview.transform)
								//EntityLibrary.dropPreview.visible = false;
								transformNode.add(asset, true);
								dropPreview.add(transformNode, true);
							}
						});
					}
				}
				else if (/material|texture|child|environment/.test(currentDrag.type)) {
					dropPreview = new THREE.Object3D();//new THREE.Mesh(new THREE.SphereGeometry(1, 30, 30), EntityLibrary.createPreviewMaterial());
					_dScene.add(dropPreview, true);
				}
			}
		});

		//when dragging over the 3d view, update the preview positoin	
		$("#vwf-root").on('dragover', "#index-vwf", function(evt)
		{
			evt.preventDefault();
			if(!currentDrag) return;
						
			if (currentDrag.type == 'asset' || currentDrag.type == 'model')
			{
				var pos = _Editor.GetInsertPoint(evt.originalEvent);
				if(currentDrag.snap)
				{
					pos[0] = _Editor.SnapTo(pos[0],currentDrag.snap); 
					pos[1] = _Editor.SnapTo(pos[1],currentDrag.snap); 
					pos[2] = _Editor.SnapTo(pos[2],currentDrag.snap); 
				}
				dropPreview.position.copy( new THREE.Vector3(pos[0], pos[1], pos[2]));
				dropPreview.updateMatrixWorld();
			}
			else if (/material|texture|child/.test(currentDrag.type))
			{
				var ID = GetPick(evt);
				if (ID)
				{
					var bound = _Editor.findviewnode(ID).GetBoundingBox(true);
					_RenderManager.flashHilight(_Editor.findviewnode(ID));
					bound = bound.transformBy(toGMat(_Editor.findviewnode(ID).matrixWorld));
					var x = ((bound.max[0] - bound.min[0]) / 2) + bound.min[0];
					var y = ((bound.max[1] - bound.min[1]) / 2) + bound.min[1];
					var z = ((bound.max[2] - bound.min[2]) / 2) + bound.min[2];

					var ss = MATH.distanceVec3(bound.max, bound.min) / 1.9;
					dropPreview.position.set(x, y, z);
					dropPreview.scale.set(ss, ss, ss);
					dropPreview.updateMatrixWorld();
				}
			}
			else if (currentDrag.type == 'environment')
			{
				dropPreview.position.set(0, 0, 0);
				dropPreview.scale.set(10, 10, 10);
				dropPreview.updateMatrixWorld();
			}
		});

		//remove the preview,
		$("#vwf-root").on('dragleave', "#index-vwf",function(evt)
		{
			if (dropPreview) {
				_dScene.remove(dropPreview, true);
				_RenderManager.removeHilightObject(dropPreview);
				dropPreview = null;
			}
		});

		//remove the preview and do the creation
		$("#vwf-root").on('drop',"#index-vwf", function(evt)
		{
			evt.preventDefault();
			if(!currentDrag) return;
			data = JSON.parse(evt.originalEvent.dataTransfer.getData('text'));

			if (dropPreview)
			{
				_dScene.remove(dropPreview, true);
				 _RenderManager.removeHilightObject(dropPreview);
				dropPreview = null;
				create(data, evt);
			}
		});
	}

	function create(data, evt)
	{
		function createProto(proto)
		{
			//very important to clean the node! Might have accidently left a name or id in the libarary
			var newname = GUID();
			proto = _DataManager.getCleanNodePrototype(proto);
			if (!proto.properties)
				proto.properties = {};
			proto.properties.owner = _UserManager.GetCurrentUserName()
			if (!proto.properties.transform)
				proto.properties.transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
			proto.properties.transform[12] = pos[0];
			proto.properties.transform[13] = pos[1];
			proto.properties.transform[14] = pos[2];
					
			if(data.dropOffset)
			{
				var dropOffset = new THREE.Matrix4();
				dropOffset.fromArray(data.dropOffset);
				var transform = new THREE.Matrix4();
				transform.fromArray(proto.properties.transform);
				transform = transform.multiply(dropOffset);
				proto.properties.transform = transform.elements;
			}

			// maintain reference to asset server, if applicable
			if( data.type === 'asset' )
				proto.properties.sourceAssetId = data.sourceAssetId;
			   
			_Editor.createChild('index-vwf', newname, proto);
			_Editor.SelectOnNextCreate([newname]);
		}

		//if its a 3d file or a node prototype
		if (data.type == 'asset' || data.type == 'model')
		{
			var pos = _Editor.GetInsertPoint(evt ? evt.originalEvent : null);
			if(data.snap)
			{
				pos[0] = _Editor.SnapTo(pos[0],data.snap); 
				pos[1] = _Editor.SnapTo(pos[1],data.snap); 
				pos[2] = _Editor.SnapTo(pos[2],data.snap); 
			}

			if (data.type == 'asset')
				$.getJSON(data.url, createProto);
			else 
			{
				var proto = {
					"extends": "asset.vwf",
					"source": data.url,
					"type": data.modelType
				};
				createProto(proto);
			}
		}
		else if (data.type == 'child')
		{
			var ID = GetPick(evt);
			if (ID) {
				$.getJSON(data.url, function(proto) {
					//very important to clean the node! Might have accidently left a name or id in the libarary
					var newname = GUID();
					proto = _DataManager.getCleanNodePrototype(proto);

					if (!proto.properties)
						proto.properties = {};
					proto.properties.owner = _UserManager.GetCurrentUserName()
					if (!proto.properties.transform)
						proto.properties.transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

					// maintain reference to asset server, if applicable
					proto.properties.sourceAssetId = data.sourceAssetId;
				   
					_Editor.createChild(ID, newname, proto);
					_Editor.SelectOnNextCreate([newname]);

				})
			}

		}
		else if (data.type == 'material')
		{
			var ID = GetPick(evt);
			if (ID) {
				$.getJSON(data.url, function(proto) {
					proto.sourceAssetId = data.sourceAssetId;
					_PrimitiveEditor.setProperty(ID, 'materialDef', proto);
				})
			}
		}
		else if( data.type === 'texture' )
		{
			var ID = GetPick(evt);
			if(ID){
				var mat = {
					"color": {"r": 1,"g": 1,"b": 1},
					"ambient": {"r": 1,"g": 1,"b": 1},
					"emit": {"r": 0,"g": 0,"b": 0},
					"specularColor": {"r": 0.57,"g": 0.57,"b": 0.57},
					"specularLevel": 1, "shininess": 15,
					"alpha": 1, "side": 2,
					"shadeless": false, "shadow": true,
					"reflect": 0.8,
					"layers": [{
						"mapTo": 1, "mapInput": 0,
						"scalex": 1, "scaley": 1,
						"offsetx": 0, "offsety": 0,
						"alpha": 1, "blendMode": 0,
						"src": data.url,
					}],
					"type": "phong"
				};
				_PrimitiveEditor.setProperty(ID, 'materialDef', mat);
			}
		}
		else if (data.type == 'environment') {
			$.getJSON(data.url, function(proto) {
				_UndoManager.startCompoundEvent();
				for (var i in proto.properties)
					_PrimitiveEditor.setProperty(vwf.application(), i, proto.properties[i]);
				for (var i in proto.children)
					_Editor.createChild(vwf.application(), GUID(), proto.children[i]);
				_UndoManager.stopCompoundEvent();
			});
		}
	}

	return {
		initialize: function(){
			$('#EntityLibrary').show();
			handleWorldDrop();
		}
	};
});

