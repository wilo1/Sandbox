// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.

define(["module", "vwf/view"], function(module, view)
{

    // vwf/view/test.js is a dummy driver used for tests.

    return view.load(module,
    {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        initialize: function()
        {
            window._dSAVE = this;
            this.nodes = {};
        },
        //public facing function to  trigger load of an S3D file. Normally this probably would live in the _Editor
        // or in the _EntityLibrary
        createS3D: function(name, url)
        {
            _assetLoader.s3dToVWF(url, function(def)
            {
                _Editor.createChild(vwf.application(), name, def);
            });

        },
        createdNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childURI, childName, callback /* ( ready ) */ ) {
        
        		var parent = this.nodes[nodeID];
        		var newNode = {
        				id:childID,
        				extends:childExtendsID,
        				source:childSource,
        				type:childType,
        				properties:{},
        				children:{}
        		}
        		if(parent)
        			parent.children[childID] = newNode;
        		this.nodes[childID] = newNode;
        },
        createdProperty:function (nodeID,propname,val)
        {
        		this.satProperty(nodeID,propname,val);
        },
        initializedProperty:function (nodeID,propname,val)
        {
        		this.satProperty(nodeID,propname,val);
        },
        satProperty:function(nodeID,propname,val)
        {
        	if(!this.nodes[nodeID]) return; 
        	this.nodes[nodeID].properties[propname] = val;
        	
        },
        initializedNode:function(nodeID)
        {
        	//if the node already has a KBID, because it is replicated (we are a late joining client), then there is no need to associate with 
        	//the ontology, because it already exists. Otherwise we are the first client to see this node, so we need to 
        	//inform the backend

        	//note this does note really handle cloning well, because the clone will be represented in the 
        	//back end by the same entities. We would need some function to ask the backend if it knows of an object
        	//by ID. This would need to be synchronous
        	if(!this.nodes[nodeID]) return; 

        	if(this.nodes[nodeID].properties["flora_ref"] && !this.nodes[nodeID].properties["kb_ID"])
        	{
        		var kbid = GUID(); //inform backend of creation here, get ID
        		vwf_view.kernel.setProperty(nodeID,'kb_ID',kbid);
        	}
        }

    });

});