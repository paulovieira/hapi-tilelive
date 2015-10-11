var Path = require("path");
var Q = require("q");
var Tilelive = require("tilelive");
var Chokidar = require("chokidar");
require("mbtiles").registerProtocols(Tilelive);

var internals = {};

internals.tilestoreHash = {};

// load one tilestore
internals.loadTilestore = function(uri){

	var deferred = Q.defer();
	Tilelive.load(uri, function(err, source) {

		if(err){
			return deferred.reject(err);
		}

		return deferred.resolve(source);
	});

	return deferred.promise;
};

internals.load = function(source){
	console.log("load2");

	delete internals.tilestoreHash;
	internals.tilestoreHash = {};

	Tilelive.list(source, function(err, tilestoreList){
debugger;

		var promises = [];
		for(var id in tilestoreList){
			promises.push(internals.loadTilestore(tilestoreList[id]));
		}

		Q.all(promises)
			.then(function(tilestoreArray){
debugger;
				tilestoreArray.forEach(function(store){

					var key = Path.basename(store.filename, ".mbtiles");
					internals.tilestoreHash[key] = store;
				});
			})
			.done();

			// TODO: if one of the mbtiles is not correctly loaded, the corresponding
			// promise will be rejected; the rejection error will be thrown in .done()
			// and the app will crash. What is the correct thing to do? 
	});

};

exports.register = function (server, pluginOptions, next) {

	//console.log("plugin registered with options: ", pluginOptions);
	
	internals.load(pluginOptions.source);

	var watcher = Chokidar.watch(pluginOptions.source, {
		awaitWriteFinish: true,
		ignoreInitial: true
	});

	watcher.on("add", function(){

		internals.load(pluginOptions.source);
	});

	watcher.on("change", function(){

		internals.load(pluginOptions.source);
	});

	watcher.on("unlink", function(){

		internals.load(pluginOptions.source);
	});

	server.route({
		method: "GET",
		path: pluginOptions.routePath,
		config: {
			handler: function(request, reply){
debugger;
				var z = +request.params.z;
				var x = +request.params.x;
				var yParam = request.params.y.split(".");
				var y = +yParam[0];

				var method = "getTile";
				if(yParam[yParam.length-1]==="json"){
					method = "getGrid";
				}	

				var store = internals.tilestoreHash[request.params.mapId];
				if(!store){
					// use the same error message as the one given by 
					// Tilelive.findID
					return reply("Tileset does not exist").code(404);
				}

				store[method](z, x, y, function(err, tile, headers) {
					debugger;
				    if (err) {
					     // if the tile does not exist, the message in the 
					     // error will be "Tile does not exist" or
					     // "Grid does not exist" (though this is not documented)
					     if(err.message === "Tile does not exist" || 
					     	err.message === "Grid does not exist"){
				            return reply(err.message).code(404);
				        }
				        else{
				        	// send the generic 500 error with no further details
				        	return reply(err);	
				        }
				    }

				    var response = reply(tile);

				    // the headers object provided by tilelive has the correct "content-type", as well
				    // as "etag" and "last-modified"
				    // by default the .header method uses the option {override: true}
				    // console.log("headers", headers);
				    for (var key in headers) {
				        response.header(key, headers[key]);
				    }

				    return;
				});
			},
			cache: {
				privacy: "public",
				expiresIn: 3600000
			},
			cors: {
				methods: ["GET"]
			}
		}

	});

	return next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};
