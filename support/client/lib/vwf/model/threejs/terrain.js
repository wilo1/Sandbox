(function(){
		function terrain(childID, childSource, childName)
		{
			
			var self = this;
			var minTileSize = 128;
			var maxTileSize = 1024;
			var worldExtents = 65536;
			var tileres = 1;
			var SW = 0;
			var SE = 1;
			var NW = 3;
			var NE = 2;
			
			 var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
        G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
        F3 = 1.0 / 3.0,
        G3 = 1.0 / 6.0,
        F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
        G4 = (5.0 - Math.sqrt(5.0)) / 20.0;
			
			
	function SimplexNoise(random) {
        if (!random) random = Math.random;
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (var i = 0; i < 256; i++) {
            this.p[i] = random() * 256;
        }
        for (i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }

    }
    
    SimplexNoise.prototype = {
        grad3: new Float32Array([1, 1, 0,
                                - 1, 1, 0,
                                1, - 1, 0,

                                - 1, - 1, 0,
                                1, 0, 1,
                                - 1, 0, 1,

                                1, 0, - 1,
                                - 1, 0, - 1,
                                0, 1, 1,

                                0, - 1, 1,
                                0, 1, - 1,
                                0, - 1, - 1]),
        grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
                                0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
                                1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
                                - 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
                                1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
                                - 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
                                1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
                                - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
        noise2D: function (xin, yin) {
            var permMod12 = this.permMod12,
                perm = this.perm,
                grad3 = this.grad3;
            var n0=0, n1=0, n2=0; // Noise contributions from the three corners
            // Skew the input space to determine which simplex cell we're in
            var s = (xin + yin) * F2; // Hairy factor for 2D
            var i = Math.floor(xin + s);
            var j = Math.floor(yin + s);
            var t = (i + j) * G2;
            var X0 = i - t; // Unskew the cell origin back to (x,y) space
            var Y0 = j - t;
            var x0 = xin - X0; // The x,y distances from the cell origin
            var y0 = yin - Y0;
            // For the 2D case, the simplex shape is an equilateral triangle.
            // Determine which simplex we are in.
            var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
            if (x0 > y0) {
                i1 = 1;
                j1 = 0;
            } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
            else {
                i1 = 0;
                j1 = 1;
            } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
            // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
            // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
            // c = (3-sqrt(3))/6
            var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
            var y1 = y0 - j1 + G2;
            var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
            var y2 = y0 - 1.0 + 2.0 * G2;
            // Work out the hashed gradient indices of the three simplex corners
            var ii = i & 255;
            var jj = j & 255;
            // Calculate the contribution from the three corners
            var t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                var gi0 = permMod12[ii + perm[jj]] * 3;
                t0 *= t0;
                n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
            }
            var t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
                t1 *= t1;
                n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
            }
            var t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
                t2 *= t2;
                n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to return values in the interval [-1,1].
            return 70.0 * (n0 + n1 + n2);
        },
        // 3D simplex noise
        noise3D: function (xin, yin, zin) {
            var permMod12 = this.permMod12,
                perm = this.perm,
                grad3 = this.grad3;
            var n0, n1, n2, n3; // Noise contributions from the four corners
            // Skew the input space to determine which simplex cell we're in
            var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
            var i = Math.floor(xin + s);
            var j = Math.floor(yin + s);
            var k = Math.floor(zin + s);
            var t = (i + j + k) * G3;
            var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
            var Y0 = j - t;
            var Z0 = k - t;
            var x0 = xin - X0; // The x,y,z distances from the cell origin
            var y0 = yin - Y0;
            var z0 = zin - Z0;
            // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
            // Determine which simplex we are in.
            var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
            var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
            if (x0 >= y0) {
                if (y0 >= z0) {
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                } // X Y Z order
                else if (x0 >= z0) {
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } // X Z Y order
                else {
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } // Z X Y order
            }
            else { // x0<y0
                if (y0 < z0) {
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } // Z Y X order
                else if (x0 < z0) {
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } // Y Z X order
                else {
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                } // Y X Z order
            }
            // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
            // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
            // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
            // c = 1/6.
            var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
            var y1 = y0 - j1 + G3;
            var z1 = z0 - k1 + G3;
            var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
            var y2 = y0 - j2 + 2.0 * G3;
            var z2 = z0 - k2 + 2.0 * G3;
            var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
            var y3 = y0 - 1.0 + 3.0 * G3;
            var z3 = z0 - 1.0 + 3.0 * G3;
            // Work out the hashed gradient indices of the four simplex corners
            var ii = i & 255;
            var jj = j & 255;
            var kk = k & 255;
            // Calculate the contribution from the four corners
            var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
            if (t0 < 0) n0 = 0.0;
            else {
                var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
                t0 *= t0;
                n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
            }
            var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
            if (t1 < 0) n1 = 0.0;
            else {
                var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
                t1 *= t1;
                n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
            }
            var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
            if (t2 < 0) n2 = 0.0;
            else {
                var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
                t2 *= t2;
                n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
            }
            var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
            if (t3 < 0) n3 = 0.0;
            else {
                var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
                t3 *= t3;
                n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to stay just inside [-1,1]
            return 32.0 * (n0 + n1 + n2 + n3);
        },
        // 4D simplex noise, better simplex rank ordering method 2012-03-09
        noise4D: function (x, y, z, w) {
            var permMod12 = this.permMod12,
                perm = this.perm,
                grad4 = this.grad4;

            var n0, n1, n2, n3, n4; // Noise contributions from the five corners
            // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
            var s = (x + y + z + w) * F4; // Factor for 4D skewing
            var i = Math.floor(x + s);
            var j = Math.floor(y + s);
            var k = Math.floor(z + s);
            var l = Math.floor(w + s);
            var t = (i + j + k + l) * G4; // Factor for 4D unskewing
            var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
            var Y0 = j - t;
            var Z0 = k - t;
            var W0 = l - t;
            var x0 = x - X0; // The x,y,z,w distances from the cell origin
            var y0 = y - Y0;
            var z0 = z - Z0;
            var w0 = w - W0;
            // For the 4D case, the simplex is a 4D shape I won't even try to describe.
            // To find out which of the 24 possible simplices we're in, we need to
            // determine the magnitude ordering of x0, y0, z0 and w0.
            // Six pair-wise comparisons are performed between each possible pair
            // of the four coordinates, and the results are used to rank the numbers.
            var rankx = 0;
            var ranky = 0;
            var rankz = 0;
            var rankw = 0;
            if (x0 > y0) rankx++;
            else ranky++;
            if (x0 > z0) rankx++;
            else rankz++;
            if (x0 > w0) rankx++;
            else rankw++;
            if (y0 > z0) ranky++;
            else rankz++;
            if (y0 > w0) ranky++;
            else rankw++;
            if (z0 > w0) rankz++;
            else rankw++;
            var i1, j1, k1, l1; // The integer offsets for the second simplex corner
            var i2, j2, k2, l2; // The integer offsets for the third simplex corner
            var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
            // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
            // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
            // impossible. Only the 24 indices which have non-zero entries make any sense.
            // We use a thresholding to set the coordinates in turn from the largest magnitude.
            // Rank 3 denotes the largest coordinate.
            i1 = rankx >= 3 ? 1 : 0;
            j1 = ranky >= 3 ? 1 : 0;
            k1 = rankz >= 3 ? 1 : 0;
            l1 = rankw >= 3 ? 1 : 0;
            // Rank 2 denotes the second largest coordinate.
            i2 = rankx >= 2 ? 1 : 0;
            j2 = ranky >= 2 ? 1 : 0;
            k2 = rankz >= 2 ? 1 : 0;
            l2 = rankw >= 2 ? 1 : 0;
            // Rank 1 denotes the second smallest coordinate.
            i3 = rankx >= 1 ? 1 : 0;
            j3 = ranky >= 1 ? 1 : 0;
            k3 = rankz >= 1 ? 1 : 0;
            l3 = rankw >= 1 ? 1 : 0;
            // The fifth corner has all coordinate offsets = 1, so no need to compute that.
            var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
            var y1 = y0 - j1 + G4;
            var z1 = z0 - k1 + G4;
            var w1 = w0 - l1 + G4;
            var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
            var y2 = y0 - j2 + 2.0 * G4;
            var z2 = z0 - k2 + 2.0 * G4;
            var w2 = w0 - l2 + 2.0 * G4;
            var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
            var y3 = y0 - j3 + 3.0 * G4;
            var z3 = z0 - k3 + 3.0 * G4;
            var w3 = w0 - l3 + 3.0 * G4;
            var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
            var y4 = y0 - 1.0 + 4.0 * G4;
            var z4 = z0 - 1.0 + 4.0 * G4;
            var w4 = w0 - 1.0 + 4.0 * G4;
            // Work out the hashed gradient indices of the five simplex corners
            var ii = i & 255;
            var jj = j & 255;
            var kk = k & 255;
            var ll = l & 255;
            // Calculate the contribution from the five corners
            var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
            if (t0 < 0) n0 = 0.0;
            else {
                var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
                t0 *= t0;
                n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
            }
            var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
            if (t1 < 0) n1 = 0.0;
            else {
                var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
                t1 *= t1;
                n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
            }
            var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
            if (t2 < 0) n2 = 0.0;
            else {
                var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
                t2 *= t2;
                n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
            }
            var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
            if (t3 < 0) n3 = 0.0;
            else {
                var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
                t3 *= t3;
                n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
            }
            var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
            if (t4 < 0) n4 = 0.0;
            else {
                var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
                t4 *= t4;
                n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
            }
            // Sum up and scale the result to cover the range [-1,1]
            return 27.0 * (n0 + n1 + n2 + n3 + n4);
        }


    };
	self.SimplexNoise = new SimplexNoise();
			function TileCache()
			{
				this.tiles = {};
				
				this.mat = new THREE.MeshPhongMaterial();
							this.mat.color.r = .5;
							this.mat.color.g = .5;
							this.mat.color.b = .5;
							this.mat.transparent = true;
							this.mat.depthcheck = false;
							this.mat.wireframe = true;
							this.mat.fog = false;
							
				this.getMesh = function(res,size)
				{
					if(this.tiles[res])
						for(var i = 0; i < this.tiles[res].length; i++)
							if(!this.tiles[res][i].parent && this.tiles[res][i].size == size)
								return this.tiles[res][i];
					if(!this.tiles[res])		
						this.tiles[res] = [];
						
					var newtile = new THREE.Mesh(new THREE.PlaneGeometry(size,size,res,res),this.mat);
					newtile.geometry.dynamic = true;
					newtile.size = size;
					newtile.receiveShadow = true;
					newtile.castShadow = false;
					//this.tiles[res].push(newtile);
					return newtile;
				}
			}
			self.TileCache = new TileCache();
			self.debug = new THREE.Mesh(new THREE.SphereGeometry(3));
			self.debug2 = new THREE.Mesh(new THREE.SphereGeometry(3));
			self.debug.material.fog = false;
			self.debug2.material.fog = false;
			function QuadtreeNode(min,max,root,depth,quad)
			{
				
				if(!depth)
					this.depth = 1;
				else
					this.depth = depth;
				this.children = [];
				this.mesh = null;
				this.min = min;
				this.max = max;
				this.quadrent = quad;
				
				this.THREENode = root;
				this.c = [this.min[0] + (this.max[0]-this.min[0])/2,this.min[1] + (this.max[1]-this.min[1])/2]
				
				this.SW = function()
				{
					return this.children[SW];
				}
				this.SE = function()
				{
					return this.children[SE];
				}
				this.NW = function()
				{
					return this.children[NW];
				}
				this.NE = function()
				{
					return this.children[NE];
				}
				this.child = function(quad)
				{
					return this.children[quad];
				}
				this.sibling = function(quad)
				{
					return this.parent.child(quad);
				}
				this.twodeep = function()
				{
					if(!this.isSplit())
						return false;
					
					for(var i = 0; i < 4; i++)
					{
						if(this.children[i].isSplit())
							return true;

					}				
					return false;					
				}
				this.balance = function(removelist)
				{
				
				
					
					var leaves = this.getLeavesB();
					while(leaves.length > 0)
					{
						var l = leaves.shift();
						if(!l) continue;
						var nn = l.NN();
						var sn = l.SN();
						var en = l.EN();
						var wn = l.WN();
						if((nn && nn.twodeep() )||(sn && sn.twodeep())||(en && en.twodeep())||(wn && wn.twodeep()))
						{
							
							l.split(removelist);
							leaves.splice(0,0,l.NW());
							leaves.splice(0,0,l.NE());
							leaves.splice(0,0,l.SW());
							leaves.splice(0,0,l.SE());
							
							
						 }
						
						
						
						
						
					}
				}
				
				this.northNeighbor = function()
				{
					var p = this;
					while(p.quadrent != SW && p.quadrent != SE)
					{
						if(!p.parent) return null;
						p = p.parent;
					}
					var walk = -1;
					if(p.quadrent == SW)
					{
						p = p.sibling(NW);
						walk = SE;
					}
					else if(p.quadrent == SE)
					{
						p = p.sibling(NE);
						walk = SW;
					}
					while(p && p.depth < this.depth && p.isSplit())
					{
						if(p.c[0] > this.c[0])
							p = p.child(SW);
						if(p.c[0] < this.c[0])
							p = p.child(SE);	
					}
						
					return p;		
						
				}
				this.NN = this.northNeighbor;
				
				this.southNeighbor = function()
				{
					var p = this;
					while(p.quadrent != NW && p.quadrent != NE)
					{
						if(!p.parent) return null;
						p = p.parent;
					}
					var walk = -1;
					if(p.quadrent == NW)
					{
						p = p.sibling(SW);
						walk = NE;
					}
					else if(p.quadrent == NE)
					{
						p = p.sibling(SE);
						walk = NW;
					}
					while(p && p.depth < this.depth && p.isSplit())
					{
						if(p.c[0] > this.c[0])
							p = p.child(NW);
						if(p.c[0] < this.c[0])
							p = p.child(NE);	
					}
						
					return p;		
						
				}
				this.SN = this.southNeighbor;
				
				this.eastNeighbor = function()
				{
					var p = this;
					while(p.quadrent != NW && p.quadrent != SW)
					{
						if(!p.parent) return null;
						p = p.parent;
					}
					var walk = -1;
					if(p.quadrent == NW)
					{
						p = p.sibling(NE);
						walk = SW;
					}
					else if(p.quadrent == SW)
					{
						p = p.sibling(SE);
						walk = NW;
					}
					while(p && p.depth < this.depth && p.isSplit())
					{
						if(p.c[1] > this.c[1])
							p = p.child(SW);
						if(p.c[1] < this.c[1])
							p = p.child(NW);	
					}
					return p;		
						
				}
				this.EN = this.eastNeighbor;
				
				this.westNeighbor = function()
				{
					var p = this;
					while(p.quadrent != NE && p.quadrent != SE)
					{
						if(!p.parent) return null;
						p = p.parent;
					}
					var walk = -1;
					if(p.quadrent == NE)
					{
						p = p.sibling(NW);
						walk = NE;
					}
					else if(p.quadrent == SE)
					{
						p = p.sibling(SW);
						walk = SE;
					}
					while(p && p.depth < this.depth && p.isSplit())
					{
						if(p.c[1] > this.c[1])
							p = p.child(SE);
						if(p.c[1] < this.c[1])
							p = p.child(NE);	
					}
					return p;		
						
				}
				this.WN = this.westNeighbor;
				
				this.getLeavesB = function(list)
				{
					if(!list)
						list = [];
				
					
					if(!this.isSplit())
						list.push(this);
					else
					{
						for(var i = 0; i < this.children.length; i ++)
						{
							this.children[i].getLeavesB(list);
						}
						this.children[0].getLeavesB(list);
					}
					
					return list;
				}
				this.getLeaves = function(list)
				{
					if(!list)
						list = [];
				
					
					if(!this.isSplit())
						list.push(this);
					else
					{
						for(var i = 0; i < this.children.length; i ++)
						{
							this.children[i].getLeaves(list);
						}
						
					}
					
					return list;
				}
				
				this.updateMesh = function()
				{
					if(!this.isSplit())
					{
						if(!this.mesh)
						{
							
							
							if(this.max[0] - this.min[0] < maxTileSize)
							{
								var res = tileres;
								this.mesh = self.TileCache.getMesh(res,this.max[0] - this.min[0]);
								if(self.removelist.indexOf(this.mesh)>-1)
								self.removelist.splice(self.removelist.indexOf(this.mesh),1);
								this.mesh.position.x = this.c[0];
								this.mesh.position.y = this.c[1];
								this.mesh.position.z = 1;
								//self.BuildTerrainInner(this.mesh);
								this.THREENode.add(this.mesh,true);
								this.mesh.updateMatrixWorld(true);
							}
						}
					}else
					{
						if(this.mesh)
						{
							this.mesh.parent.remove(this.mesh);
							this.mesh = null;
						}
					}
					if(this.isSplit())
					for(var i=0; i < this.children.length; i++)
						this.children[i].updateMesh();
				}
				this.cleanup = function(removelist)
				{
					this.walk(function(n)
					{
						if(n.setForDesplit)
						{
							
							for(var i=0; i < n.children.length; i++)
							n.children[i].destroy(removelist);
							n.children = [];
							delete n.setForDesplit;
						}
					});
				}
				this.isSplit = function() {if(this.setForDesplit) return false; return this.children.length > 0;}
				this.split = function(removelist)
				{
					if(this.setForDesplit)
					{
						delete this.setForDesplit;
						return;
					}
					if(this.isSplit())
						return;
					if(this.mesh)
					{
						//this.mesh.parent.remove(this.mesh);
						removelist.push(this.mesh);
						this.mesh = null;
					}
					
					var sw = new QuadtreeNode([this.min[0],this.min[1]],[this.c[0],this.c[1]],this.THREENode,this.depth+1,SW);
					var se = new QuadtreeNode([this.c[0],this.min[1]],[this.max[0],this.c[1]],this.THREENode,this.depth+1,SE);
					var nw = new QuadtreeNode([this.min[0],this.c[1]],[this.c[0],this.max[1]],this.THREENode,this.depth+1,NW);
					var ne = new QuadtreeNode([this.c[0],this.c[1]],[this.max[0],this.max[1]],this.THREENode,this.depth+1,NE);
					
					sw.parent = this;
					se.parent = this;
					nw.parent = this;
					ne.parent = this;
					
					this.children[SW] = sw;
					this.children[SE] = se;
					this.children[NW] = nw;
					this.children[NE] = ne;
					
					
				}
				this.deSplit = function(removelist)
				{
					//this.walk(function(n)
					//{
						
						
					
					//});
					for(var i=0; i < this.children.length; i++)
						this.children[i].deSplit(removelist);
					this.setForDesplit = true;
				}
				this.destroy = function(removelist)
				{
					if(this.mesh)
					{
						//this.mesh.parent.remove(this.mesh);
						removelist.push(this.mesh);
						this.mesh = null;
					}
					for(var i=0; i < this.children.length; i++)
						this.children[i].destroy(removelist);
				}
				this.contains = function(point)
				{
					
					var tempmin = this.min;
					var tempmax = this.max;
					if(tempmin[0] < point[0] && tempmax[0] > point[0] && 
					tempmin[1] < point[1] && tempmax[1] > point[1])
						return true;
					return false;
				}
				this.loosecontains = function(point)
				{
					
					var tempmin = [this.min[0] - (this.max[0] - this.min[0])/2 , this.min[1] - (this.max[1] - this.min[1])/2]
					var tempmax = [this.max[0] + (this.max[0] - this.min[0])/2 , this.max[1] + (this.max[1] - this.min[1])/2]
					if(tempmin[0] < point[0] && tempmax[0] > point[0] && 
					tempmin[1] < point[1] && tempmax[1] > point[1])
						return true;
					return false;
				}
				this.containing = function(point)
				{
					if(this.contains(point) && !this.isSplit())
						return this;
					if(this.isSplit())
					{
						if(this.NW().contains(point))
							return this.NW().containing(point);
						if(this.NE().contains(point))
							return this.NE().containing(point);
						if(this.SW().contains(point))
							return this.SW().containing(point);
						if(this.SE().contains(point))
							return this.SE().containing(point);							
					
					}
					return null;
				}
				this.walk = function(cb)
				{
					cb(this);
					if(this.isSplit())
					for(var i =0 ; i < this.children.length; i++)
					{
						this.children[i].walk(cb);
					
					}
					
				}
				this.getBottom = function(list)
				{
					if(!list)
						list = [];
					this.walk(function(node)
					{
						if(node.bottom)
							list.push(node);
					
					});
					return list;	
				}
				this.update = function(campos,removelist)
				{
					var cont = false
					for(var i =0; i < campos.length; i++)
					{
						cont = cont || this.contains(campos[i]);
					}
					if(cont)
					{
						
						if(!this.isSplit())
						{
							if(this.max[0]-this.min[0] > minTileSize)
							{
								this.split(removelist);
								
								for(var i=0; i < this.children.length; i++)
									if(this.children[i].max[0]-this.children[i].min[0] < minTileSize)
										this.children[i].bottom = true;;
				
				
							}else
							{
								
							}
							
						}else
						{
						
						}
					}else
					{
						if(this.isSplit())
						{
							this.deSplit(removelist);
						}
					
					}
					if(this.isSplit())
					for(var i=0; i < this.children.length; i++)
						this.children[i].update(campos,removelist);
				}
			}
			
			
			
			function ControlPoint(x,y,z,d,f)
			{
			    
				this.x = x || 0;
				this.y = y || 0;
				this.z = z || 0;
				this.falloff = f||1;
				this.dist = d||10;
				this.getPoint = function()
				{
					return new THREE.Vector3(this.x,this.y,this.z);
				}
			}
			
			this.settingProperty = function(propertyName,propertyValue)
			{
				if(propertyName == 'controlPoints')
				{
					this.controlPoints = propertyValue;
					this.BuildTerrain();
				}
			}
			this.controlPoints = [];
			this.initializingNode = function()
			{
				
				vwf.setProperty(this.ID,'controlPoints',this.controlPoints);
				Math.sign = function(e){ return e<0?-1:1};
				if(this.controlPoints.length == 0)
				{
				
				
				//this.controlPoints.push(new ControlPoint(0,0,0,1,1));
				
				
				}
				
				//this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(100,100,100,100),new THREE.MeshPhongMaterial());
				//this.mesh.material.color.r = .5;
				//this.mesh.material.color.g = .5;
				//this.mesh.material.color.b = .5;
				//this.geo = this.mesh.geometry;
				//this.getRoot().add(this.mesh);
				this.DisableTransform();
				this.BuildTerrain();
				this.quadtree = new QuadtreeNode([-worldExtents,-worldExtents],[worldExtents,worldExtents],this.getRoot());
			
				this.minSize = 32;
				this.quadtree.update([[1,1]],[]);
				//this.quadtree.balance();
				this.quadtree.updateMesh();
				window.terrain = self;
				this.counter = 0;
			}
			this.Debug = function(pt)
			{
				this.debug.position.x = pt.c[0];
				this.debug.position.y = pt.c[1];
				this.debug.updateMatrixWorld();
			}
			this.removelist = [];
			this.ticking = function()
			{
				this.counter ++;
				if(this.counter == 30)
				{
					this.counter = 0;
					var  insertpt = _Editor.GetInsertPoint();
					var x = insertpt[0];
					var y = insertpt[1];
					 
					 if(this.containing != this.quadtree.containing([x,y]).parent)
					 {
						
					
						
							self.needRebuild = [];
					//	self.removelist.forEach(function(e,i)
					//			{
					//				if(e && e.parent)
					//					e.parent.remove(e);
					//			})
					//			self.removelist = []
						this.quadtree.update([[x,y]],this.removelist);
						
						this.containing = this.quadtree.containing([x,y]).parent;
						
						this.quadtree.balance(this.removelist);
						this.quadtree.balance(this.removelist);
						this.containing.NN().split(this.removelist);
						this.containing.SN().split(this.removelist);
						this.containing.EN().split(this.removelist);
						this.containing.WN().split(this.removelist);
						var nodes = this.quadtree.getBottom();
						
						
						this.quadtree.cleanup(this.removelist);
						var newleaves = this.quadtree.getLeaves();
					
						for(var i = 0; i <  newleaves.length; i++)
						{
						
							if(!newleaves[i].mesh)
							{
								if(newleaves[i].max[0] - newleaves[i].min[0] < maxTileSize)
									self.needRebuild.push(newleaves[i]);
							}
								
						}
						console.log('Rebuilding Terrain Tiles: ' +self.needRebuild.length);
						self.needRebuild.sort(function(a,b)
						{
							return (a.max[0] - a.min[0]) - (b.max[0] - b.min[0]);
						
						});
						var rebuild = function()
						{
							if (self.needRebuild.length > 0)
							{
								var tile = self.needRebuild.shift();
								tile.updateMesh();
								self.buildTimeout = window.setTimeout(self.rebuild,3);
								console.log('rebuilding ' + self.needRebuild.length + ' tile');
							}else
							{
								console.log('removing ' + self.removelist.length + ' tile');
								self.removelist.forEach(function(e,i)
								{
									if(e && e.parent)
										e.parent.remove(e);
								})
								self.removelist = []
							}
						}.bind(self);
						self.rebuild = rebuild;
						if(self.buildTimeout)
							window.clearTimeout(self.buildTimeout);
						self.buildTimeout = window.setTimeout(self.rebuild,3);
						
					}
					
				}
			}
			this.callingMethod = function(methodName,args)
			{
				if(methodName == 'setPoint')
				{
					if(args.length == 6)
					{
						var cp = this.controlPoints[args[0]];
						cp.x = args[1];
						cp.y = args[2];
						cp.z = args[3];
						cp.dist = args[4];
						cp.falloff = args[5];
					}
					else if(args.length == 2)
					{
						this.controlPoints[args[0]] = args[1];
					}
					this.BuildTerrain();
					return true;
				}
				if(methodName == 'getPoint')
				{
					return this.controlPoints[args[0]];
				}
				if(methodName == 'getPointCount')
				{
					return this.controlPoints.length;
				}
			}
			this.gettingProperty = function(propertyName)
			{
				
				if(propertyName == 'controlPoints')
				{
					return this.controlPoints ;
				}
				if(propertyName == 'type')
				{	
					return 'Terrain';
				}					
			}
			
			this.BuildTerrain = function()
			{
				for(var i =0; i < this.getRoot().children.length; i++)
					this.BuildTerrainInner(this.getRoot().children[i]);
			
			}
			
			this.BuildTerrainInner= function(mesh)
			{
				//if(!this.geo) return;
				//return;
				
				var geo = mesh.geometry;
				var mx = mesh.position.x;
				var my = mesh.position.y;
				var normals = [];
				for(var i = 0; i < geo.vertices.length; i++)
				{
					
					var vertn = geo.vertices[i];
					var vertx0 = new THREE.Vector3(vertn.x-1,vertn.y,vertn.z);
					var verty0 = new THREE.Vector3(vertn.x,vertn.y-1,vertn.z);
					var vertx1 = new THREE.Vector3(vertn.x+1,vertn.y,vertn.z);
					var verty1 = new THREE.Vector3(vertn.x,vertn.y+1,vertn.z);
					var verts = [vertn,vertx0,verty0,vertx1,verty1];
					for(var k = 0; k < verts.length; k++)
					{
						var z = 0;
						var vert = verts[k];
						// for(var j = 0; j < this.controlPoints.length; j++)
						// {
							// var cp = this.controlPoints[j];
							// var dist = Math.sqrt(((vert.x + mx) - cp.x) * ((vert.x + mx) - cp.x) + ((vert.y + my) - cp.y) * ((vert.y + my) - cp.y));
							// dist = Math.max(dist,0);
							// z +=  Math.max(0, cp.z - Math.pow(cp.z * dist/cp.dist,cp.falloff));
						// }
						//z = Math.sin((mx + vert.x)/10) * 10;
						z = self.SimplexNoise.noise2D((mx + vert.x)/30,(my + vert.y)/30) * 2.5;
						vert.z = z;
					}
					//var n = vertn.clone().sub(vertx).cross(vertn.clone().sub(verty)).normalize();
					var n = new THREE.Vector3(vertx1.z - vertx0.z,verty1.z - verty0.z,(vertx1.x - vertx0.x)*2)
					normals.push(n);
				}
				
				for(var i =0; i < geo.faces.length; i++)
				{	
					geo.faces[i].vertexNormals[0] = normals[geo.faces[i].a];
					geo.faces[i].vertexNormals[1] = normals[geo.faces[i].b];
					geo.faces[i].vertexNormals[2] = normals[geo.faces[i].c];
					geo.faces[i].vertexNormals[3] = normals[geo.faces[i].d];
				
				}
				geo.verticesNeedUpdate = true;
				geo.computeBoundingSphere();
				geo.computeBoundingBox();
				geo.normalsNeedUpdate = true
				
			}
			
			
			//must be defined by the object
			this.getRoot = function()
			{
				return this.rootnode;
			}
			this.rootnode = new THREE.Object3D();
			this.inherits = ['vwf/model/threejs/transformable.js'];
			//this.Build();
		}
		
		//default factory code
        return function(childID, childSource, childName) {
			//name of the node constructor
            return new terrain(childID, childSource, childName);
        }
})();