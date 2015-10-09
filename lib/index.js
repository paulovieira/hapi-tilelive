var Path = require("path");
var Q = require("q");
var Tilelive = require('tilelive');
require('mbtiles').registerProtocols(Tilelive);

var internals = {};

// load one tilestore
internals.loadTilestore = function(uri){
debugger;
	var deferred = Q.defer();
	Tilelive.load(uri, function(err, source) {

		if(err){
			return deferred.reject(err);
		}

		deferred.resolve(source);
	});

	return deferred.promise;
};

// loads the list of tilestores provided by Tilelive.list
internals.load = function(tilestoreList){
debugger;
	var promises = [];
	for(var id in tilestoreList){
		promises.push(internals.loadTilestore(tilestoreList[id]));
	}

	return Q.all(promises);
};

exports.register = function (server, pluginOptions, next) {

	console.log("plugin registered with options: ", pluginOptions);
	Tilelive.list(pluginOptions.source, function(err, tilestoreList){
debugger;
		internals.load(tilestoreList)
			.then(function(tilestoreArray){
				debugger;
				var tilestoreHash = {};

				tilestoreArray.forEach(function(store){

					var key = Path.basename(store.filename, ".mbtiles");
					tilestoreHash[key] = store;
				});

				console.log("TODO: create the route for the tiles");
				return next();
			})
			.catch(function(err){
				debugger;
				return next(err);	
			});
	});

    
};


exports.register.attributes = {
    pkg: require('../package.json')
};
