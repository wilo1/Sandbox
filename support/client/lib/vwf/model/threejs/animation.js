"use strict";
(function() {
    //enum to keep track of assets that fail to load
    function animation(childID, childSource, childName, childType, assetSource, asyncCallback) {
        this.childID = childID;
        this.childSource = childSource;
        this.childName = childName;
        this.childType = childType;
        this.assetSource = assetSource;

        this.getRoot = function() {
            return this.rootnode;
        };
        this.rootnode = new THREE.Object3D();

        this.loaded = function(asset, rawAnimationChannels) {
            if (!asset) {
                this.loadFailed();
                return;
            }
            $(document).trigger('EndParse', ['Loading...', assetSource]);

            var clone = asset.clone();
            var animation = clone;
            animation.userData.rawAnimationChannels = rawAnimationChannels;
            animation.userData.animation = asset.animation;

            this.getRoot().add(animation);

            //this.initializingNode();

        }.bind(this);

        this.loadFailed = function(id) {

        }.bind(this);

        if (!assetSource) {
            return;
        }
        this.inherits = ['vwf/model/threejs/asset.js']
        this.initialize = function() {
            var self = this;
            debugger;
            assetRegistry.get(childType, assetSource, self.loaded, self.loadFailed);
            asyncCallback(true);

            this.settingProperty_originial = this.settingProperty;
            this.settingProperty = function(property, value) {
                this.settingProperty_originial(property, value);
            }
        };


        // map the loaded animation to the skeleton bones of the avatar
        this.attachAnimation = function(asset, skin, userID, cycleTrigger, type) {
            var rawAnimationChannels = asset.rawAnimationChannels;

            function getBone(name, bones) {
                // Retrieves a bone from skeleton based on its name
                if (name && bones && bones.length > 0) {
                    for (var i in bones) {
                        if (bones[i].name === name) {
                            return bones[i];
                            break;
                        } else if ((i + 1) === bones.length) {
                            return null;
                        }
                    }
                } else {
                    return null;
                }
            }
            avatarLoaded(skin);

            function avatarLoaded(skin) {
                // set bones as targets to our new animation channels
                for (var name in rawAnimationChannels) {
                    var nodeAnimationChannels = rawAnimationChannels[name];

                    if (!nodeAnimationChannels[0].target)
                        break;

                    // Since we cloned our bones, change to our new bones in animation channels
                    var boneName = nodeAnimationChannels[0].target.name;
                    var newBone = getBone(boneName, skin[0].skeleton.bones);
                    for (var i in nodeAnimationChannels)
                        nodeAnimationChannels[i].target = newBone;
                }
                // Create glTFAnimation
                var animations = [];
                for (var name in rawAnimationChannels) {
                    var nodeAnimationChannels = rawAnimationChannels[name];

                    if (!nodeAnimationChannels[0].target)
                        break;

                    var anim = new THREE.glTFAnimation(nodeAnimationChannels);
                    anim.name = "animation_" + name;
                    animations.push(anim);
                }
                this.addAnimationHandler(skin, animations, asset, userID, cycleTrigger, type)
            }
        }

        // create animation handler defining the cyle and index
        this.addAnimationHandler = function(skin, animations, asset, userID, cycleTrigger, type) {
            // Now add AnimationHandler wrapper
            skin = skin[0];
            var list = [];
            getAllLeafMeshes(skin, list);

            var anims = []
            var largestDuration = 0

            for (var i = 0; i < list.length; i++) {
                if (!list[i] instanceof THREE.SkinnedMesh) {
                    continue;
                }
                // Add animation based on the argument passed
                var animationHandle = list[i].animationHandle;
                var animHandleWrapper = new AnimationHandleWrapper(animations, asset.name);
                list[i].animationHandle = this.MergeAnimations(animationHandle, animHandleWrapper, asset.assetKey);
                list[i].animationHandle.setKey(0);
                list[i].updateMatrixWorld();
                //how does the bone relate to the skeleton?
                for (var j = 0; j < list[i].children.length; j++) {
                    list[i].children[j].updateMatrixWorld(true);
                }

                // Get animation info (describes which part of animationHandle.glTFAnimations is which animation)
                if (list[i].animationHandle.merged && list[i].animationHandle.merged[1]) {
                    anims.push(list[i].animationHandle.merged[1]) // the second animation is the new one from above ^
                    delete list[i].animationHandle.merged
                } else {
                    anims.push({
                        name: list[i].animationHandle.name || ('anim' + i),
                        startIndex: 0,
                        length: list[i].animationHandle.glTFAnimations.length,
                        duration: list[i].animationHandle.duration,
                        assetKey: asset.assetKey
                    })
                }

                if (list[i].animationHandle.duration > largestDuration)
                    largestDuration = list[i].animationHandle.duration

                largestDuration = Math.round(largestDuration)
            }

            // update animation metadata and handlerindex for each cycle
            var animationMetaData = vwf.getProperty(userID, 'animationMetaData')
            var aoList = JSON.parse(JSON.stringify(vwf.getProperty(userID, "cycles")));

            // add handler information so that we know what index to play from
            if (cycleTrigger && aoList[cycleTrigger]) {
                aoList[cycleTrigger].handlerIndex = anims[0].startIndex
                aoList[cycleTrigger].handlerLength = anims[0].length + anims[0].startIndex
            } else if (type != "animation") {
                aoList[type].handlerIndex = anims[0].startIndex
                aoList[type].handlerLength = anims[0].length + anims[0].startIndex
            }
            vwf.setProperty(userID, 'cycles', aoList);

            if (!animationMetaData) {
                animationMetaData = [];
            }

            for (var i = 0; i < anims.length; i++) {
                animationMetaData.push(anims[i])
            }
            vwf.setProperty(userID, 'animationMetaData', animationMetaData);

            if (_Sequencer.isOpen)
                _Sequencer.BuildGUI()

        }

        //handle for wrapping the glTF animation format
        this.AnimationHandleWrapper = function(gltfAnimations, name) {
            this.duration = 0;
            this.lastKey = null;
            this.glTFAnimations = gltfAnimations;
            this.name = name || 'anim'
            for (var i in this.glTFAnimations) {
                // comparing current duration with animation and setting the higher value
                this.duration = Math.max(this.duration, this.glTFAnimations[i].duration)
            }
            // setting & updating the current keyframe, triggered by the cycle settings
            this.setKey = function(key, handlerIndex, handlerLength, fps) {
                if (this.lastKey == key) return;
                this.lastKey = key;


                if (!handlerIndex)
                    handlerIndex = 0

                if (!handlerLength)
                    handlerLength = 33

                for (var j = handlerIndex; j < handlerLength; j++) {
                    if (!this.glTFAnimations[j]) {
                        // this should never happen.. but in case it does we can investigate starting with the active cycle
                        //console.error('CYCLE IS OUT OF RANGE: activeCycle', vwf.getProperty(_UserManager.GetCurrentUserID(), "activeCycle"))
                        console.log("waiting for animation...")
                        break
                    }
                    var i, len = this.glTFAnimations[j].interps.length;
                    for (i = 0; i < len; i++) {

                        this.glTFAnimations[j].interps[i].interp(key / fps);
                        //this.glTFAnimations[j].interps[i].targetNode.updateMatrix();
                    }
                }
            };
            this.data = {
                length: this.duration,
                fps: 30
            };
        };

        this.MergeAnimations = function(currentHandler, newHandler, assetKey) {
            var animInfo = []
            if (currentHandler.merged) {
                animInfo = animInfo.concat(currentHandler.merged)
            }
            if (newHandler.merged) {
                animInfo = animInfo.concat(newHandler.merged)
            }
            if (currentHandler.merged || newHandler.merged) {
                if (!currentHandler.merged) {
                    animInfo.push({
                        name: currentHandler.name || 'anim1',
                        startIndex: newHandler.merged.length,
                        length: currentHandler.glTFAnimations.length,
                        duration: currentHandler.duration
                    })
                } else if (!newHandler.merged) {
                    animInfo.push({
                        name: newHandler.name || 'anim2',
                        startIndex: currentHandler.merged.length,
                        length: newHandler.glTFAnimations.length,
                        duration: newHandler.duration,
                        assetKey: assetKey
                    })
                }
            }
            if (animInfo.length === 0) {
                animInfo = [{
                    name: currentHandler.name || 'anim1',
                    startIndex: 0,
                    length: currentHandler.glTFAnimations.length,
                    duration: currentHandler.duration,
                    assetKey: 'local'
                },

                    {
                        name: newHandler.name || 'anim2',
                        startIndex: currentHandler.glTFAnimations.length,
                        length: newHandler.glTFAnimations.length,
                        duration: newHandler.duration,
                        assetKey: assetKey
                    }
                ]
            }
            var gltfAnims = currentHandler.glTFAnimations.concat(newHandler.glTFAnimations)
            var handler = new AnimationHandleWrapper(gltfAnims, 'merged-' + (currentHandler.name || 'anim1') + '_' + (newHandler.name || 'anim2'))
            handler.merged = animInfo
            return handler
        }
    }
    //default factory code
    return function(childID, childSource, childName, childType, assetSource, asyncCallback) {
        //name of the node constructor
        return new animation(childID, childSource, childName, childType, assetSource, asyncCallback);
    }
})();
