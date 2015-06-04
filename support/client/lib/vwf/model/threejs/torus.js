(function(){
		function torus(childID, childSource, childName)
		{
			
			this.radius1 = 1;
			this.radius2 = .1;
			this.rseg1 = 6;
			this.rseg2 = 10;
			this.arc = Math.PI * 2;
			this.outputType = "Primitive";
        	this.inputType = null;
			
			

			this.inherits = ['vwf/model/threejs/prim.js'];
			//the node constructor
			this.settingProperty = function(propertyName,propertyValue)
			{
				if(propertyName == 'radius1' || propertyName == 'radius2' || propertyName == 'rseg1' || propertyName == 'rseg2' || propertyName == 'arc')
				{
					this[propertyName] = propertyValue;
					this.dirtyStack(true);
				}
			}
			this.initializingNode = function()
			{
				this.dirtyStack(true);
			}
			this.gettingProperty = function(propertyName)
			{
				if(propertyName == 'radius1' || propertyName == 'radius2' || propertyName == 'rseg1' || propertyName == 'rseg2' || propertyName == 'arc'||
				 propertyName =='EditorData')
				return this[propertyName];
			}
			this.BuildMesh = function(mat)
			{
				
				var mesh=  new THREE.Mesh(new THREE.TorusGeometry(this.radius1,this.radius2,this.rseg1,this.rseg2,this.arc), mat);
				
				return mesh;
			}
			
			//must be defined by the object
			this.getRoot = function()
			{
				return this.rootnode;
			}
			this.rootnode = new THREE.Object3D();
			//this.Build();
		}
		//default factory code
        return function(childID, childSource, childName) {
			//name of the node constructor
            return new torus(childID, childSource, childName);
        }
})();

//@ sourceURL=threejs.subdriver.torus