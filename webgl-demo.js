dat.GUI.prototype.removeFolder = function(name)
{
	var folder = this.__folders[name];
	if (!folder)
		return;
	
	folder.close();
	this.__ul.removeChild(folder.domElement.parentNode);
	delete this.__folders[name];
	this.onResize();
}

////////////////////////////////////////////////////////////////////////////////////////////

var tIdx =
{
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,

	FastFileDesc:
	{
		pos: 'uint32',
		size: 'uint32'
	},
	
	File: {	 
		Num: 'uint32',
		Files: ['array', 'FastFileDesc', 'Num'],
	}
};

var tModel =
{
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	Vector3D:
	{
		x : 'int16',
		y : 'int16',
		z : 'int16',
	},
	
	UV:
	{
		u : 'int16',
		v : 'int16',
	},
	
	Indexes:
	{
		va : 'int16',
		vb : 'int16',
		vc : 'int16',
		
		ta : 'int16',
		tb : 'int16',
		tc : 'int16',
	},
	
	Anim:
	{
		startFrame : 'int16',
		endFrame   : 'int16',
		speed      : 'int16',
	},

	File:
	{
		headerSize : 'int16',
		numFrames  : 'int16',
		numVerts  : 'int16',
		numUVs	: 'int16',
		numIndexes	: 'int16',
		sizeOfVertsData	 : 'int16',
		w6	: 'int16',
				
		vertices: ['array', ['array', 'Vector3D', 'numVerts'], 'numFrames'],
		texCoords: ['array', 'UV', 'numUVs'],
		indexes: ['array', 'Indexes', 'numIndexes'],
		
		numTextures : 'int16',
		width : 'int16',
		height : 'int16',
		
		textures: ['array', ['array', ['array', 'uint16', 'width'], 'height'], 'numTextures'],
		
		numAnims : 'int16',
		anims: ['array', 'Anim', 'numAnims'],
	}
};

var tZFile =
{
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	
	File:
	{
		size: 'uint32',
		data: ['array', 'uint8', function () { return this.binary.view.byteLength-4; } ],
	}
};

var tCellPalette =
{	
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	tEntry:
	{
		unk : 'int16',
		z : 'int16',
		ceil : 'int16',
		floors : ['array', 'int16', 4],
		ceils : ['array', 'int16', 4],
		surface : ['array', 'uint8', 11],
		unk2 : 'int16',
		unk3 : 'uint8',
	},
	
	File:
	{
		numCells: 'uint32',
		cells: ['array', 'tEntry', 'numCells' ],
	}
};

var tMap =
{	
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	tEntry:
	{
		Flag        : 'uint16',
		Light       : 'uint16',
		CellPalette : 'uint16',
	},
	
	File:
	{
		name: ['string', 32],
		auth: ['string', 32],
		desc: ['string', 64],
		width : 'int16',
		height : 'int16',

		//cells: ['array', ['array', 'tEntry', 'width'], 'height'],
		cells: ['array', 'tEntry', context => (context.width * context.height)],
	}
};

var tSurface =
{	
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	tEntry:
	{
		uShift        : 'uint8',
		vShift        : 'uint8',
		uOffset       : 'int16',
		vOffset       : 'int16',
		Flags         : 'uint8',
		Tex           : 'uint8',
	},
	
	File:
	{
		numSurfaces : 'uint8',
		surf: ['array', 'tEntry', 'numSurfaces'],
	}
};

var tTextures =
{	
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	File:
	{
		numTextures : 'uint8',
		tex: ['array', ['array', 'uint8', context => (128*128)], 'numTextures'],
	}
};

var tLUA =
{	
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	File:
	{
		pal: ['array', 'uint16', context => (256*256)],
	}
};

var tEntity =
{
	'jBinary.all': 'File',
	'jBinary.littleEndian': true,
	
	tEntry:
	{
		x        : 'int32',
		y        : 'int32',
		z        : 'int16',
		unk      : 'int16',
		Roll     : 'int16',
		unk1     : 'int16',
		Pitch    : 'int16',
		unk2     : 'int16',
		Turn     : 'int16',
		unk3     : 'int16',
		Scale    : 'int16',
		unk4     : 'int16',
		template : 'uint32',
		id: ['string', 8],
		script: ['string', 32],
	},
	
	File:
	{
		numEntities : 'int32',

		entities: ['array', 'tEntry', 'numEntities'],
	}
};

function max(a, b) { return a < b ? b : a; }
function min(a, b) { return a < b ? a : b; }
function clamp(num, min, max) { return num <= min ? min : num >= max ? max : num; }

function float2int (value)  { return value | 0; }
function fx8_8_to_float(fx) { return (fx) / (1 << 8); }
function float_to_fx8_8(fx) { return float2int((fx) * (1 << 8)); }

function loadText(filename, cb)
{
	let req = new XMLHttpRequest();
	req.open("GET", filename, true);
	req.responseType = "text";

	req.onload = function(oEvent)
	{
		cb(req.response);
	};

	req.send(null);
}

function Read(filename, template, cb)
{
	jBinary.load(filename, template).then(function(jb)
	{
		var data = jb.readAll();
		cb(data);
	});
}

function ReadZ(filename, template, cb)
{
	jBinary.load(filename, tZFile).then(function(jb)
	{
		var arr = new Uint8Array(jb.readAll().data);
		var reader = new jBinary(pako.inflate(arr), template);
		var data = reader.readAll();
		cb(data);
	});
}


var MapViewer = function()
{
	this.init();
	this.animate();
};

MapViewer.prototype.init = function()
{
	this.clock = new THREE.Clock();
	
	this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
	this.renderer.setPixelRatio( window.devicePixelRatio );
	this.renderer.setClearColor( 0x00000000, 1.0 );
	this.renderer.setSize( window.innerWidth, window.innerHeight );
	this.renderer.outputEncoding = THREE.sRGBEncoding;
	
	this.container = document.createElement( 'div' );
	document.body.appendChild( this.container );			
	
	this.container.appendChild( this.renderer.domElement );
  
	/*
	var progress = document.createElement('div');
	var progressBar = document.createElement('div');
	
	progress.appendChild(progressBar);
	
	document.body.appendChild(progress);
	
	var manager = new THREE.LoadingManager();
	manager.onProgress = function ( item, loaded, total )
	{
		progressBar.style.width = (loaded / total * 100) + '%';
	};*/


	this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .01, 1000)
	//this.camera.position.set( 0.075, 2.075, 4.55 );
	this.camera.position.set( -26.50, 44.30, 50.0 );
	
	this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
	/*this.controls.enableDamping = true
	this.controls.dampingFactor = 0.2
	this.controls.zoomSpeed = 1.4
	this.controls.rotateSpeed = 0.6
	this.controls.enableKeys = false
*/
	this.controls.enableKeys = true
	//this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	this.controls.dampingFactor = 0.05;
	this.controls.screenSpacePanning = false;
	this.controls.minDistance = -Infinity;
	this.controls.maxDistance = Infinity;
	this.controls.rotateSpeed = 1.4
	this.controls.zoomSpeed = 1.4
	this.controls.enableDamping = false
	
	//this.controls.maxPolarAngle = Math.PI / 2;


	this.scene = new THREE.Scene();
	this.grid = new THREE.GridHelper( 128, 128, 0xffffff, 0x555555 );
	//this.scene.add( this.grid );
				
	this.geo = null;
	this.mesh = null;
	this.curmodel = null;
	
	this.stats = new Stats();
	this.container.appendChild( this.stats.dom );
	
	this.rec = false;
	
	this.playbackConfig = {  };
	this.skinConfig = { DrawProps: true, DrawCelling: false, TransparentBackground: false, NearestFiltering: true, DbgBounds: false, Grid: false, ExportObj: this.expObj, ExportGLTF : this.expGLTF };
	
	this.gui = new dat.GUI();
	
	this.gui.add( this.skinConfig, 'DrawProps', true ).onChange( function (){} );
	this.gui.add( this.skinConfig, 'DrawCelling', true ).onChange( function (){} );
	this.gui.add( this.skinConfig, 'NearestFiltering', true ).onChange( function (){} );
	this.gui.add( this.skinConfig, 'DbgBounds', true ).onChange( function (){} );
	
	this.gui.add( this.skinConfig, 'TransparentBackground', true ).onChange( function ()
	{
		if (window.viewer.skinConfig.TransparentBackground)
			window.viewer.renderer.setClearColor( 0x00000000, 0 );
		else
			window.viewer.renderer.setClearColor( 0x00000000, 1.0 );
	} );
	
	this.gui.add( this.skinConfig, 'Grid', true ).onChange( function ()
	{
		if (window.viewer.skinConfig.Grid)
			window.viewer.scene.add( window.viewer.grid );
		else
			window.viewer.scene.remove( window.viewer.grid );
	} );

	this.gui.add( this.skinConfig, 'ExportObj' )
	this.gui.add( this.skinConfig, 'ExportGLTF' )
	
	var folder = this.gui.addFolder( "maps" );
		
	var generateCallback = function ( name )
	{
		return function ()
		{
			LoadZ(name, window.viewer.skinConfig.DrawProps);
		};
	};
	
	var maps = ["azra", "broken1", "broken2", "crypt1", "crypt2", "crypt3", "delfhide", "drgnfld", "dstar_e", "dstar_w", "erthcave", "fearfrst", "ffarena", "ghstpass", "glaciercrawl", "lakvan", "lothcav", "raiders", "snowline", "stouttp", "twilite"];
	
	for ( var i = 0; i < maps.length; i++ )
	{
		var name = maps[i];
	
		this.skinConfig[ name ] = generateCallback( name );
		folder.add( this.skinConfig, name ).name( name );
	}
		
	folder.open();
	
	loadText('tes/entities.txt', function(tx)
	{
		let lines = tx.split("\n");
		
		for(let i = 0; i < lines.length; i++)
		{
			if (lines[i])
			{
				let line = lines[i].split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } )
				if ( line[0] && line[1] && line[2] && line[3] )
				{
					let template = Number(line[0]);
					let modelid = Number(line[1]);
					let w = Number(line[2]);
					let h = Number(line[3]);
					
					EntitiesMap[template] = new EntitieMap(modelid, w, h);
				}
			}
		}
	});
	
	window.addEventListener('resize', this.resize, false)
};
			
MapViewer.prototype.animate = function()
{
	requestAnimationFrame(this.animate.bind(this));
	this.render();
	this.stats.update();
};

MapViewer.prototype.render = function()
{
	var delta = this.clock.getDelta();

	this.renderer.render(this.scene, this.camera);
	if (this.rec)
		recorder.capture(this.renderer.domElement);
};

MapViewer.resize = function()
{
	this.camera.aspect = window.innerWidth / window.innerHeight;
	this.camera.updateProjectionMatrix();

	this.renderer.setSize( window.innerWidth, window.innerHeight );
	
	this.controls.handleResize();
}

function CLUT4BitTo8Bit(pixel)
{
	return pixel | 16 * pixel;
}

function GetTexture(data, width, height)
{
	var texture = new THREE.Texture();
	
	{
		var useOffscreen = typeof OffscreenCanvas !== 'undefined';

		var canvas = useOffscreen ? new OffscreenCanvas( width, height ) : document.createElement( 'canvas' );
		canvas.width = width;
		canvas.height = height;

		var context = canvas.getContext( '2d' );
		var imageData = context.createImageData( width, height );

		{
			var i = 0;
			
			for ( var y = height-1; y >= 0; y-- )
			{

				for ( var x = 0; x < width; x++, i += 4 )
				{
					var pixel = data[y][x];
			
					var r = CLUT4BitTo8Bit(pixel & 15);
					var g = CLUT4BitTo8Bit((pixel>>4) & 15);
					var b = CLUT4BitTo8Bit((pixel>>8) & 15);
					var a = CLUT4BitTo8Bit((pixel>>12) & 15);		
			
					imageData.data[ i + 0 ] = b;
					imageData.data[ i + 1 ] = g;			
					imageData.data[ i + 2 ] = r;
					if (pixel == 0xF0F)
						imageData.data[ i + 3 ] = 0;
					else
						imageData.data[ i + 3 ] = 255;
				}
			}
		}
		
		context.putImageData( imageData, 0, 0 );
		texture.image = useOffscreen ? canvas.transferToImageBitmap() : canvas;
	}
	
	texture.needsUpdate = true;
	if ( window.viewer.skinConfig.NearestFiltering )
		texture.magFilter = THREE.NearestFilter;
	
	return texture;
}


function main()
{
	window.viewer = new MapViewer();	
	console.log('loaded');
}

//////////////////////////////////////////////////////////////////////////////////////////////

var CellPalette = null;
var pMap = null;
var Surface = null;
var Textures = null;
var LUAData = null;
var Entities = null;
var Models = new Array(256);
var EntitiesMap = {};

function EntitieMap(mid, w, h)
{
	this.model = mid;
	this.width = w;
	this.height = h;
};

function ParseMesh(mdl, animid, id)
{
	var animoffset = mdl.numVerts * animid;
	var lastffset = (mdl.numFrames -1) * mdl.numVerts;
	
	var geo = new THREE.Geometry();
	
	var n = animid; //for ( var n = 0; n < mdl.numFrames; n++ )
	{
		for ( var i = 0; i < mdl.numVerts; i++ )
		{
			var vert = mdl.vertices[n][i];
			
			geo.vertices.push(new THREE.Vector3(fx8_8_to_float(vert.x), fx8_8_to_float(vert.y), fx8_8_to_float(vert.z)));
		}
	}
	
	for ( var i = 0; i < mdl.numIndexes; i++ )
	{
		var idx = mdl.indexes[i];
		
		var fc = new THREE.Face3(animoffset+idx.va, animoffset+idx.vb, animoffset+idx.vc);
		geo.faces.push(fc);
		
		var ta = mdl.texCoords[idx.ta];
		var tb = mdl.texCoords[idx.tb];
		var tc = mdl.texCoords[idx.tc];
		
		var uva = new THREE.Vector2(fx8_8_to_float(ta.u)/(mdl.width), 1.0-(fx8_8_to_float(ta.v)/(mdl.height)));
		var uvb = new THREE.Vector2(fx8_8_to_float(tb.u)/(mdl.width), 1.0-(fx8_8_to_float(tb.v)/(mdl.height)));
		var uvc = new THREE.Vector2(fx8_8_to_float(tc.u)/(mdl.width), 1.0-(fx8_8_to_float(tc.v)/(mdl.height)));
		
		geo.faceVertexUvs[0].push([ uva, uvb, uvc ] );
	}
	
	var mp = GetTexture( mdl.textures[animid], mdl.width, mdl.height );
	mp.flipY = false;
	mp.wrapS = THREE.RepeatWrapping;
	mp.wrapT = THREE.MirroredRepeatWrapping;
	mp.encoding = THREE.sRGBEncoding;
	
	var mat = new THREE.MeshBasicMaterial( { map: mp, transparent: true } );
	mat.alphaTest = 0.5;
	
	mat.name = "mat_model" + id + "tex" + animid;
	var mS = (new THREE.Matrix4()).identity();
	mS.elements[10] = -1;
	
	geo.applyMatrix(mS);
	
	var tmp;
	for(var f = 0; f < geo.faces.length; f++) {
		tmp = geo.faces[f].clone();
		geo.faces[f].a = tmp.c;
		geo.faces[f].c = tmp.a;
	}

	geo.computeFaceNormals();
	geo.computeVertexNormals();

	var faceVertexUvs = geo.faceVertexUvs[ 0 ];
	for ( var i = 0; i < faceVertexUvs.length; i ++ ) {

		var temp = faceVertexUvs[ i ][ 0 ];
		faceVertexUvs[ i ][ 0 ] = faceVertexUvs[ i ][ 2 ];
		faceVertexUvs[ i ][ 2 ] = temp;
	}

	var mesh = new THREE.Mesh(geo, mat);
	
	return mesh;
}

function LoadModels(lines)
{
	Read('tes/models.idx', tIdx, function(idx)
	{
		jBinary.load('tes/models.huge', tModel).then(function(huge)
		{
			for(let i = 0; i < lines.length; i++)
			{
				if (lines[i])
				{
					let line = lines[i].split(" ");
					
					let id = Number(line[0]);
					let name = line[4];
					
					
					if ( Models[id] )
					{
						Models[id].geometry.dispose();
						Models[id].material.dispose();
					}
					
					Models[id] = null;
					
					if ( idx.Files[id].size != 0 && name != "NULL.bin" )
					{
						var model = huge.seek(idx.Files[id].pos, function() { return huge.read('File');});
						
						Models[id] = ParseMesh(model, 0, id);
					}
				}
			}
			
			
			LoadedEvent();
		});
	});
}

function LoadZ(name, usemodels)
{
	ReadZ('tes/'+name+'.zcp', tCellPalette, function(cp)
	{
		CellPalette = cp;
		ReadZ('tes/'+name+'.zmp', tMap, function(mp)
		{
			pMap = mp;
			Read('tes/'+name+'.sur', tSurface, function(sur)
			{
				Surface = sur;
				ReadZ('tes/'+name+'.ztx', tTextures, function(tex)
				{
					Textures = tex;
					
					ReadZ('tes/'+name+'.zlu', tLUA, function(lua)
					{
						LUAData = lua;
						
						if ( usemodels )
						{
							Read('tes/'+name+'.ent', tEntity, function(ent)
							{
								Entities = ent;
								
								loadText('tes/'+name+'_models.txt', function(txt)
								{
									let lines = txt.split("\n");
									LoadModels(lines)
								});
							});
						}
						else
							LoadedEvent();
					});
				});
			});
		});
	});
}

function LoadedEvent()
{	
	window.viewer.SetupScene();
}

function GetLevelTexture(ti)
{
	var texture = new THREE.Texture();
	
	var width = 128;
	var height = 128;
	{
		var useOffscreen = typeof OffscreenCanvas !== 'undefined';

		var canvas = useOffscreen ? new OffscreenCanvas( width, height ) : document.createElement( 'canvas' );
		canvas.width = width;
		canvas.height = height;

		var context = canvas.getContext( '2d' );
		var imageData = context.createImageData( width, height );

		{
			var i = 0;
						
			for ( var y = 0; y < height; y++ )
			{
				for ( var x = 0; x < width; x++, i += 4 )
				{
					var index = Textures.tex[ti][y*width+x];
					
					var pixel = LUAData.pal[index+256*32];
					
					var r = CLUT4BitTo8Bit(pixel & 15);
					var g = CLUT4BitTo8Bit((pixel>>4) & 15);
					var b = CLUT4BitTo8Bit((pixel>>8) & 15);
			
					imageData.data[ i + 0 ] = b;
					imageData.data[ i + 1 ] = g;			
					imageData.data[ i + 2 ] = r;

					imageData.data[ i + 3 ] = 255;
				}
			}
		}
		
		context.putImageData( imageData, 0, 0 );
		texture.image = useOffscreen ? canvas.transferToImageBitmap() : canvas;
	}
	
	texture.needsUpdate = true;
	if ( window.viewer.skinConfig.NearestFiltering )
		texture.magFilter = THREE.NearestFilter;
	
	return texture;
}

var Materials = new Array(256);
var Geometry  = new Array(256);
var Vertices  = new Array(256);
var Indeses   = new Array(256);
var UVs       = new Array(256);
var Count     = new Array(256);

MapViewer.prototype.SetupScene = function()
{
	this.scene.remove.apply(this.scene, this.scene.children);
	
	var mapgroup = new THREE.Group();
	
	for ( var i = 0; i < Surface.numSurfaces; i++ )
	{
		var mp = GetLevelTexture( Surface.surf[i].Tex );
		mp.flipY = false;
		mp.wrapS = THREE.RepeatWrapping;
		mp.wrapT = THREE.RepeatWrapping;
		mp.encoding = THREE.sRGBEncoding;
		var mat;
		if ( this.skinConfig.DrawCelling  )
			mat = new THREE.MeshBasicMaterial( { map: mp } );
		else
			mat = new THREE.MeshBasicMaterial( { map: mp, side: THREE.DoubleSide } );
		
		mat.name = "mat_tx" + Surface.surf[i].Tex;
		Materials[i] = mat;
		Geometry[i] = new THREE.BufferGeometry();
		Vertices[i] = [];
		Indeses[i] = [];
		UVs[i] = [];
		Count[i] = 0;
	}

	for ( var y = 0; y < pMap.height; y++ )
	{
		for ( var x = 0; x < pMap.width; x++ )
		{
			var c      = pMap.cells[x+(y*pMap.width)];
			
			var pxc  = pMap.cells[clamp(((x-1)+((y)*pMap.width)), 0, pMap.width*pMap.height-1)];
			var pyc  = pMap.cells[clamp(((x)+((y-1)*pMap.width)), 0, pMap.width*pMap.height-1)];
			
			var nxc  = pMap.cells[clamp(((x+1)+((y)*pMap.width)), 0, pMap.width*pMap.height-1)];
			var nyc  = pMap.cells[clamp(((x)+((y+1)*pMap.width)), 0, pMap.width*pMap.height-1)];
			
			var cp     = CellPalette.cells[c.CellPalette];
			
			var pxcp = CellPalette.cells[pxc.CellPalette];
			var pycp = CellPalette.cells[pyc.CellPalette];
			var nxcp = CellPalette.cells[nxc.CellPalette];
			var nycp = CellPalette.cells[nyc.CellPalette];
			
			var wrldSector = null;
			
			var posXLessThenPos    = true;
			var posXGreatenThenPos = true;
			var posYLessThenPos    = true;
			var posYGreatenThenPos = true;

			var camAboveCell       = true;
			var ceilOk             = true; //CamZ < GetCeil()
			
			if ( posXLessThenPos || c.Flag & 8 )
			{
				if ( nxcp.surface[0] != 255 )
				{
					if (   cp.floors[2] < nxcp.floors[3]
						|| cp.floors[1] < nxcp.floors[0] )
					{
						wrldSector = new WorldSector
						(
							new xyz( x+1,  y  , fx8_8_to_float(nxcp.floors[3])),
							new xyz( x+1,  y  , fx8_8_to_float(cp.floors[2])                       ),
							new xyz( x+1,  y+1, fx8_8_to_float(cp.floors[1])                       ),
							new xyz( x+1,  y+1, fx8_8_to_float(nxcp.floors[0])                   )
						);
						
						BuildVerts(wrldSector, nxcp.surface[4], Surface.surf[nxcp.surface[0]].Flags&2 ? 0 : 1);
					}
					
					if (   max(cp.floors[2], nxcp.ceils[3]) < cp.ceils[2]
						|| max(cp.floors[1], nxcp.ceils[0]) < cp.ceils[1] )
					{
						wrldSector = new WorldSector
						(
							new xyz( x+1,  y  , fx8_8_to_float(cp.ceils[2])                       ),
							new xyz( x+1,  y  , fx8_8_to_float(max(cp.floors[2], nxcp.ceils[3]))),
							new xyz( x+1,  y+1, fx8_8_to_float(max(cp.floors[1], nxcp.ceils[0]))),
							new xyz( x+1,  y+1, fx8_8_to_float(cp.ceils[1])                       )
						);
						
						BuildVerts(wrldSector, nxcp.surface[0], Surface.surf[nxcp.surface[0]].Flags&2 ? 0 : 1);
					}
				}
			}
			
			if ( posXGreatenThenPos || c.Flag & 8 )
			{
				if ( pxcp.surface[1] != 255 )
				{
					if (   cp.floors[0] < pxcp.floors[1]
						|| cp.floors[3] < pxcp.floors[2] )
					{
						wrldSector = new WorldSector
						(
							new xyz( x,  y+1, fx8_8_to_float(pxcp.floors[1])),
							new xyz( x,  y+1, fx8_8_to_float(cp.floors[0])                       ),
							new xyz( x,  y  , fx8_8_to_float(cp.floors[3])                       ),
							new xyz( x,  y  , fx8_8_to_float(pxcp.floors[2])                   )
						);
						
						BuildVerts(wrldSector, pxcp.surface[5], Surface.surf[pxcp.surface[1]].Flags&2 ? 1 : 0);
					}
					
					if (   max(cp.floors[0], pxcp.ceils[1]) < cp.ceils[0]
						|| max(cp.floors[3], pxcp.ceils[2]) < cp.ceils[3] )
					{
						wrldSector = new WorldSector
						(
							new xyz( x,  y+1, fx8_8_to_float(cp.ceils[0])                       ),
							new xyz( x,  y+1, fx8_8_to_float(max(cp.floors[0], pxcp.ceils[1]))),
							new xyz( x,  y  , fx8_8_to_float(max(cp.floors[3], pxcp.ceils[2]))),
							new xyz( x,  y  , fx8_8_to_float(cp.ceils[3])                       )
						);
						
						BuildVerts(wrldSector, pxcp.surface[1], Surface.surf[pxcp.surface[1]].Flags&2 ? 1 : 0);
					}
				}
			}
			
			
			if ( posYLessThenPos || c.Flag & 8 )
			{
				if (   cp.floors[1] < nycp.floors[2]
					|| cp.floors[0] < nycp.floors[3] )
				{
					wrldSector = new WorldSector
					(
						new xyz( x+1, y+1, fx8_8_to_float(nycp.floors[2])),
						new xyz( x+1, y+1, fx8_8_to_float(cp.floors[1])   ),
						new xyz( x,   y+1, fx8_8_to_float(cp.floors[0])   ),
						new xyz( x,   y+1, fx8_8_to_float(nycp.floors[3]))
					);
					
					BuildVerts(wrldSector, nycp.surface[6], 2);
				}
				
				if (   max(cp.floors[1], nycp.ceils[2]) < cp.ceils[1]
					|| max(cp.floors[0], nycp.ceils[3]) < cp.ceils[0] )
				{
					wrldSector = new WorldSector
					(
						new xyz( x+1, y+1, fx8_8_to_float(cp.ceils[1])                        ),
						new xyz( x+1, y+1, fx8_8_to_float(max(cp.floors[1], nycp.ceils[2])) ),
						new xyz( x,   y+1, fx8_8_to_float(max(cp.floors[0], nycp.ceils[3])) ),
						new xyz( x,   y+1, fx8_8_to_float(cp.ceils[0])                        )
					);
					
					BuildVerts(wrldSector, nycp.surface[2], 2);
				}
			}
			
			
			if ( posYGreatenThenPos || c.Flag & 8 )
			{
				if (   cp.floors[3] < pycp.floors[0]
					|| cp.floors[2] < pycp.floors[1] )
				{
					wrldSector = new WorldSector
					(
						new xyz( x,   y, fx8_8_to_float(pycp.floors[0])),
						new xyz( x,   y, fx8_8_to_float(cp.floors[3])    ),
						new xyz( x+1, y, fx8_8_to_float(cp.floors[2])    ),
						new xyz( x+1, y, fx8_8_to_float(pycp.floors[1]))
					);
					
					BuildVerts(wrldSector, pycp.surface[7], 3);
				}
				
				if (   max(cp.floors[3], pycp.ceils[0]) < cp.ceils[3]
					|| max(cp.floors[2], pycp.ceils[1]) < cp.ceils[2] )
				{
					wrldSector = new WorldSector
					(
						new xyz( x,   y, fx8_8_to_float(cp.ceils[3])                      ),
						new xyz( x,   y, fx8_8_to_float(max(cp.floors[3], pycp.ceils[0]))),
						new xyz( x+1, y, fx8_8_to_float(max(cp.floors[2], pycp.ceils[1]))),
						new xyz( x+1, y, fx8_8_to_float(cp.ceils[2])                      )
					);
					
					BuildVerts(wrldSector, pycp.surface[3], 3);
				}
			}
			
			// floor

			if ( !(c.Flag & 2) && (camAboveCell || c.Flag & 4) )
			{
				wrldSector = new WorldSector
				(
					new xyz( x,   y+1, fx8_8_to_float(cp.floors[0])),
					new xyz( x+1, y+1, fx8_8_to_float(cp.floors[1])),
					new xyz( x+1, y  , fx8_8_to_float(cp.floors[2])),
					new xyz( x,   y  , fx8_8_to_float(cp.floors[3]))
				);
				
				BuildVerts(wrldSector, cp.surface[10], 5);
			}
			
			
			if ( this.skinConfig.DrawCelling )
			{
				if ( !(c.Flag & 2 && ceilOk && !( c.Flag & 64 )) )
				{
					//if ( ceilOk )
					{
						if ( !(c.Flag & 2 ) )
						{
							wrldSector = new WorldSector
							(
							
								new xyz( x,   y  , fx8_8_to_float(cp.ceils[3])),
								new xyz( x+1, y  , fx8_8_to_float(cp.ceils[2])),
								new xyz( x+1, y+1, fx8_8_to_float(cp.ceils[1])),
								new xyz( x,   y+1, fx8_8_to_float(cp.ceils[0]))
							);
							
							BuildVerts(wrldSector, cp.surface[8], 4);
						}
					}
					//else
					{
						wrldSector = new WorldSector
						(
							new xyz( x,   y+1, fx8_8_to_float(cp.ceils[0])),
							new xyz( x+1, y+1, fx8_8_to_float(cp.ceils[1])),
							new xyz( x+1, y  , fx8_8_to_float(cp.ceils[2])),
							new xyz( x,   y  , fx8_8_to_float(cp.ceils[3]))
						);
						
						BuildVerts(wrldSector, cp.surface[9], 4);
					}
				}
			}

		}
	}
	
	for ( var t = 0; t < Surface.numSurfaces; t++ )
	{
		if ( Vertices[t].length > 0 )
		{
			var myvertices = [];
			var myindices = [];
			var myuvs = [];
		
			for ( var i = 0; i < Vertices[t].length; i+=3 )
				myvertices.push( -Vertices[t][i], Vertices[t][i+2], Vertices[t][i+1] );
			
			for ( var i = 0; i < Indeses[t].length; i+=3 )
				myindices.push( Indeses[t][i], Indeses[t][i+2], Indeses[t][i+1] );
			
			for ( var i = 0; i < UVs[t].length; i+=2 )
				myuvs.push( UVs[t][i], UVs[t][i+1] );
			
			Geometry[t].setIndex( myindices );
			Geometry[t].setAttribute( 'position', new THREE.Float32BufferAttribute( myvertices, 3 ) );
			Geometry[t].setAttribute( 'uv', new THREE.Float32BufferAttribute( myuvs, 2 ) );
			
			var mesh = new THREE.Mesh( Geometry[t], Materials[t] );
			
			mapgroup.add( mesh );
		}
	}
	
	if ( this.skinConfig.DrawProps )
	{
		for ( var i = 0; i < Entities.numEntities; i++ )
		{
			var ent = Entities.entities[i];
			var x = fx8_8_to_float(float_to_fx8_8(fx8_8_to_float(ent.x)));
			var y = fx8_8_to_float(float_to_fx8_8(fx8_8_to_float(ent.y)));
			
			if ( x >= 0 && y >= 0 && x <= pMap.width && y <= pMap.height )
			{
				var e = EntitiesMap[ent.template];
				if ( e )
				{
					///if ( ent.template == 10 || ent.template == 1050 ) // "!roof" || "!poolgook"
					{
						;
						//e.model
						//
						//e.height
						
						//if (x - e.width <= e.width + x)
					}
					//else
					{					
						var m = Models[e.model].clone();
						
						m.position.set(-(fx8_8_to_float(ent.x)), fx8_8_to_float(ent.z), fx8_8_to_float(ent.y));
						
						m.geometry.computeBoundingBox();
						m.scale.set(fx8_8_to_float(ent.Scale), fx8_8_to_float(ent.Scale), fx8_8_to_float(ent.Scale));
	
						m.rotateX(-(fx8_8_to_float(ent.Roll) *(Math.PI / 127))) ;
						m.rotateZ(-(fx8_8_to_float(ent.Pitch) *(Math.PI /127)));
						m.rotateY(-(fx8_8_to_float(ent.Turn) *(Math.PI /127))); // turn/yaw
						
						if ( this.skinConfig.DbgBounds )
						{
							var helper = new THREE.BoundingBoxHelper(m, 0xff0000);
							helper.update();
							mapgroup.add( helper );
						}
			
						mapgroup.add( m );
					}
				}
			}
		}
	}
	
	var completeBoundingBox = new THREE.Box3();
	completeBoundingBox.expandByObject(mapgroup);
	var objectCenter = completeBoundingBox.center();
	mapgroup.position.x -= objectCenter.x;
	mapgroup.position.y -= objectCenter.y;
	mapgroup.position.z -= objectCenter.z;
	
	//mapgroup.position.y += 25;
	
	if ( this.skinConfig.DbgBounds )
	{
		var helper = new THREE.BoundingBoxHelper(mapgroup, 0xff0000);
		helper.update();
		this.scene.add(helper);
	}
	
	this.scene.add( mapgroup );
}

MapViewer.prototype.expGLTF = function()
{
		
	var exporter = new THREE.GLTFExporter();

		exporter.parse( window.viewer.scene, function ( result ) {
			var buff = str2ab(JSON.stringify( result, null, 2 ));
			var blob = new Blob([buff]);
		
			saveAs(blob, 'map.gltf');
	

		} );
}
MapViewer.prototype.expObj = function()
{
	var exporter = new THREE.OBJExporter();
	var buff = str2ab(exporter.parse(window.viewer.scene));
	var blob = new Blob([buff]);
		
	saveAs(blob, 'map.obj');
}

function str2ab(str)
{
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i=0, strLen=str.length; i < strLen; i++)
	{
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

function xyz(_x, _y, _z)
{
    this.x = _x;
    this.y = _y;
    this.z = _z;
}

function WorldSector(_a, _b, _c, _d)
{
    this.a = _a;
    this.b = _b;
    this.c = _c;
    this.d = _d;
}

function BuildVerts(sector, surf, uvtype)
{
	if ( surf == 255 )
		return;
		
	if ( Surface.surf[surf].Flags & 32 )
		return;
	
	var a = new VertOffset(CellPalette.cells[pMap.cells[clamp(sector.a.x+(sector.a.y*pMap.width), 0, pMap.width*pMap.height-1)].CellPalette].unk3, sector.a);
	var b = new VertOffset(CellPalette.cells[pMap.cells[clamp(sector.b.x+(sector.b.y*pMap.width), 0, pMap.width*pMap.height-1)].CellPalette].unk3, sector.b);
	var c = new VertOffset(CellPalette.cells[pMap.cells[clamp(sector.c.x+(sector.c.y*pMap.width), 0, pMap.width*pMap.height-1)].CellPalette].unk3, sector.c);
	var d = new VertOffset(CellPalette.cells[pMap.cells[clamp(sector.d.x+(sector.d.y*pMap.width), 0, pMap.width*pMap.height-1)].CellPalette].unk3, sector.d);
	
	var t= surf;
	
	Vertices[t].push( a.x, a.y, a.z );
	Vertices[t].push( b.x, b.y, b.z );
	Vertices[t].push( c.x, c.y, c.z );
	Vertices[t].push( d.x, d.y, d.z );
	
	var n = Count[t];
	
	Indeses[t].push( n+0, n+1, n+2 ); // face one
	Indeses[t].push( n+0, n+2, n+3 ); // face two
	
	Count[t]+=4;
	
	var vuva = a;
	var vuvb = b;
	var vuvc = c;
	var vuvd = d;
	
	var uva = new GetUV(uvtype, vuva, Surface.surf[surf].uOffset, Surface.surf[surf].vOffset, Surface.surf[surf].uShift, Surface.surf[surf].vShift);
	var uvb = new GetUV(uvtype, vuvb, Surface.surf[surf].uOffset, Surface.surf[surf].vOffset, Surface.surf[surf].uShift, Surface.surf[surf].vShift);
	var uvc = new GetUV(uvtype, vuvc, Surface.surf[surf].uOffset, Surface.surf[surf].vOffset, Surface.surf[surf].uShift, Surface.surf[surf].vShift);
	var uvd = new GetUV(uvtype, vuvd, Surface.surf[surf].uOffset, Surface.surf[surf].vOffset, Surface.surf[surf].uShift, Surface.surf[surf].vShift);
	
	UVs[t].push(Surface.surf[surf].Flags&1?-uva.u:uva.u, Surface.surf[surf].Flags&2?-uva.v:uva.v);
	UVs[t].push(Surface.surf[surf].Flags&1?-uvb.u:uvb.u, Surface.surf[surf].Flags&2?-uvb.v:uvb.v);
	UVs[t].push(Surface.surf[surf].Flags&1?-uvc.u:uvc.u, Surface.surf[surf].Flags&2?-uvc.v:uvc.v);
	UVs[t].push(Surface.surf[surf].Flags&1?-uvd.u:uvd.u, Surface.surf[surf].Flags&2?-uvd.v:uvd.v);
}

function VertOffset(t, v)
{
	this.x = v.x;
    this.y = v.y;
    this.z = v.z;
	
	if ( t == 1 )
	{
		this.x += fx8_8_to_float(128);
	}
	else if ( t == 2 )
	{
		this.x -= fx8_8_to_float(128);
		this.y += fx8_8_to_float(128);
	}
	else if ( t == 3 )
	{
		this.x -= fx8_8_to_float(128);
	}
	else if ( t == 4 )
	{
		this.x += fx8_8_to_float(128);
		this.y -= fx8_8_to_float(128);
	}
	else if ( t == 5 )
		this.x += fx8_8_to_float(128);
	else if ( t == 6 )
		this.x -= fx8_8_to_float(128);
	else if ( t == 7 )
		this.y += fx8_8_to_float(128);
	else if ( t == 8 )
		this.y -= fx8_8_to_float(128);
	
}


function GetUV(uvtype, v, uoffset, voffset, ushift, vshift)
{
	if ( uvtype == 0 )
	{
		this.u = (fx8_8_to_float(uoffset)+(v.y))*(1<<ushift) / 128;
		this.v = (fx8_8_to_float(voffset)+(v.z))*(1<<vshift) / 128;
	}
	else if ( uvtype == 1 )
	{
		this.u = (fx8_8_to_float(uoffset)-(v.y))*(1<<ushift) / 128;
		this.v = (fx8_8_to_float(voffset)+(v.z))*(1<<vshift) / 128;
	}
	else if ( uvtype == 2 )
	{
		this.u = (fx8_8_to_float(uoffset)+(v.x))*(1<<ushift) / 128;
		this.v = (fx8_8_to_float(voffset)+(v.z))*(1<<vshift) / 128;
	}
	else if ( uvtype == 3 )
	{
		this.u = (fx8_8_to_float(uoffset)-(v.x))*(1<<ushift) / 128;
		this.v = (fx8_8_to_float(voffset)+(v.z))*(1<<vshift) / 128;
	}
	else if ( uvtype == 4 || uvtype == 5 )
	{
		this.u = (fx8_8_to_float(uoffset)+(v.x))*(1<<ushift) / 128;
		this.v = (fx8_8_to_float(voffset)+(v.y))*(1<<vshift) / 128;
	}
}