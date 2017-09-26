/*
	Backbone Child Collection 0.10.0
	
	Used for REST collection that is child of a parent model.
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2015-07-08
	
	https://github.com/kjantzer/backbone-child-collection
	
	TODO
	- what happenns if the parentModel is new? should collection not fetch/save?
	- if the model is destroyed, we should probably clean up all child collections
*/

// TODO: let `id` be a hash of attributes
Backbone.Collection.prototype.getOrCreate = function(id, opts){

	if( !id )
		return null;

	var model = this.get.apply(this, arguments)

	// if no model, fetch and add the requested model
	if( !model ){

		id = id instanceof Backbone.Model ? id[id.idAttribute] : id;
		var ModelClass = this.model || Backbone.Model;

		var data = {}

		if( _.isObject(id) )
			data = id;
		else
			data[ModelClass.prototype.idAttribute] = id;

		// support for Backbone Relational
		var model = ModelClass.findOrCreate
				? ModelClass.findOrCreate(data)
				: new ModelClass(data);

		model.needsFetching = true;

		// add model to this collection
		if( !opts || opts.add !== false )
			this.add(model);
		else
			model.collection = this;
	}

	return model;
}

Backbone.Collection.prototype.getOrFetch = function(id, opts){

	opts = opts || {}
	var success = _.isObject(opts) && !_.isFunction(opts) ? opts.success : opts;

	if( !id ){
		if( success ) success(null)
		return null;
	}

	var model = this.getOrCreate.apply(this, arguments)

	// model has not fetched yet (via getOrFetch)
	if( model.needsFetching ){

		delete model.needsFetching;
		model.isFetching = true;

		var finishedCallback = function(){
			delete model.isFetching
			if( success ) success(model)

			// are there any other success callbacks waiting? Call them now (see below)
			if( model._getOrFetchSuccess ){
				_.each(model._getOrFetchSuccess, function(fn){ fn(model) });
				delete model._getOrFetchSuccess;
			}
		}

		if( model.isNew() )
			model.save({}, {success: finishedCallback, error: finishedCallback})
		else
			model.fetch({data:(opts.data||null), success: finishedCallback, error: finishedCallback});

	// model currently fetching, stash the "success" callback on the model - it will be called when fetch completes
	}else if( model.isFetching && success){
		model._getOrFetchSuccess = model._getOrFetchSuccess || [];
		model._getOrFetchSuccess.push(success)

	// already fetched
	}else{
		if( success ) success(model)
	}

	return model;
}

Backbone.ChildCollection = Backbone.Collection.extend({
	
	//urlPath: 'extra/path/after/parent-url' // make sure to set this. Can also be set with options
	//stale: 5000, // fetch() wont actually fetch unless 5 seconds have passed since last fetch

	constructor: function(models, options){
	
		this.parentModel = options ? options.parentModel : null;
		
		if( options && options.urlPath ) this.urlPath = options.urlPath
		
		this.hasFetched = false;
	
		Backbone.Collection.prototype.constructor.apply(this, arguments);
	},
	
	// uses the URL from the parentModel and adds `urlPath` property
	url: function(){
		
		if( !this.parentModel || !(this.parentModel instanceof Backbone.Model) ){
			console.error('Backbone.ChildCollection: a `parentModel` is expected')
			return null
		}
		
		var url = '';
		var parentModel = this.parentModel;
		
		if( parentModel && _.isFunction(parentModel.url))
			url = parentModel.url();
		else if( parentModel )
			url = parentModel.url;
		
		if( !url ){
			console.warn('No URL on the `parentModel`');
			return null;
		}
		
		return this.urlPath ? url+'/'+this.urlPath : url;
	},
	
	fetch: function(opts){

		var opts = opts || {};
		var stale = opts.stale || this.stale;
		var onSuccess = opts.success || null;
		var timeSinceLastFetch = this.timeSinceLastFetch()

		// if a "stale" property was given, dont fetch until the date is considered stale
		if( stale && timeSinceLastFetch && timeSinceLastFetch < stale )
			return;

		this.__lastFetched = new Date;

		opts.success = function(){
			this.hasFetched = true;
			this.isFetching = false;
			onSuccess && onSuccess.apply(this, arguments)
		}.bind(this)
		
		this.isFetching = true;
		
		return Backbone.Collection.prototype.fetch.call(this, opts);
	},
	
	// returns `true` if fetching and `false` if not
	fetchOnce: function(opts){
		if( !this.hasFetched && !this.isFetching ){
			this.fetch(opts)
			return true
		}else if( opts && opts.success ){
			opts.success(this, this.models)
			return false;
		}
	},

	timeSinceLastFetch: function(){
		return this.__lastFetched ? (new Date).getTime() - this.__lastFetched.getTime() : null;
	},

	_updateFromModel: function(models){
		this.update(models);
	}
	
});

_.extend(Backbone.Model.prototype, {
	
	// DEPRECATED - just use `get`
	childCollection: function(key ){ return this.getCollection(key); }, // alias
	
	_get: Backbone.Model.prototype.get,
	_fetch: Backbone.Model.prototype.fetch,
	
	// Overrides default to get a collection if no attribute for given `key` exists
	get: function(key){
		
		var keys = (key||'').split('.')
		key = keys.shift()
		var path = keys.join('.')

		// child collection matching key?
		if( this.collections && this.collections[key] !== undefined )
			return this.getCollection(key, path);
		
		// child model matching key?
		if( this._childModel(key) )
			return this.getModel(key, path);
		
		// what about the parent model, does it have a "name" that matches?
		if( this.parentModel && this.parentModel.name == key )
			return this.parentModel
		if( this.collection && this.collection.parentModel && this.collection.parentModel.name == key )
			return this.collection.parentModel
		
		return Backbone.Model.prototype._get.apply(this, arguments)
	},

	fetch: function(opts){

		opts = opts || {};
		var onSuccess = opts.success;

		opts.success= function(){
			this.isFetching = false;
			this.hasFetched = true;
			onSuccess && onSuccess.apply(this, arguments)
		}.bind(this)

		this.isFetching = true;

		return Backbone.Model.prototype._fetch.call(this, opts)
	},

	_childModel: function(key){
		// TEMP `childModels` can also be used since `models` breaks RelationalModel
		return (this.models && this.models[key]) || (this.childModels && this.childModels[key])
	},
	
	getCollection: function(key, path){
		
		this.__childCollections = this.__childCollections || {};
		
		// collection already initialized
		if( this.__childCollections[key] )
			return path ? this._getPathFromCollection(this.__childCollections[key], path) : this.__childCollections[key];
		
		// get the collection info for setup and determine if a Collection was given
		var CollInfo = this.collections && this.collections[key];

		// is CollInfo a function (but not a Collection)? Call it to get the info
		if( CollInfo && _.isFunction(CollInfo) && CollInfo.prototype && !CollInfo.prototype.toJSON && !CollInfo.prototype.fetch )
			CollInfo = CollInfo()

		var CollGiven = CollInfo && CollInfo.prototype && CollInfo.prototype.toJSON && CollInfo.prototype.fetch;
		
		// whoops, couldn't find a collection for the given key
		if( CollInfo == undefined ){
			console.warn('Collection for `'+key+'` not set.',  this.collections)
			return null;
		}
		
		// get the "class" of Collection to instantiate
		var ChildColl = CollGiven ? CollInfo : (CollInfo.collection ? CollInfo.collection : Backbone.ChildCollection);
		
		var opts = {
			parentModel: this
		}
		
		// if the value was a string, it should be the 'urlPath'
		if( typeof CollInfo === 'string' )
			opts.urlPath = CollInfo;
		
		// else, if an object, and not a Collection, pass everything as options to the collection
		else if( !CollGiven && typeof CollInfo === 'object')
			opts = _.extend(CollInfo, opts);
		
		// get bootstrapped model data for initial creation of collection.
		// if the key of this collection matches a model attribute (and its an array), assume they're models
		var models = (this.attributes[key] && _.isArray(this.attributes[key]) && this.attributes[key]) || [];
		
		// create and store reference to this collection
		var Coll = this.__childCollections[key] = new ChildColl(models, opts)
		
		// if the collection got its data from a model attribute, listen for when that attribute changes and update the collection 
		// if( this.attributes[key] )
		// 	Coll.listenTo(this, 'change:'+key, Coll._updateFromModel)
		
		// make sure parent model is set on the collection
		Coll.parentModel = this;
		
		return path && Coll ? this._getPathFromCollection(Coll, path) : Coll;
	},

	_getPathFromCollection: function(coll, path){
		var keys = path.split('.')
		var key = keys.shift()
		path = keys.join('.')
		var m = null;

		if( key == 'first' )
			m = coll.first()
		else if( key == 'last' )
			m = coll.last()
		else if( key.match(/^\d+$/) )
			m = coll.at(key)

		return path ? m.get(path) : m
	},
	
	getModel: function(key, path){

		this.__childModels = this.__childModels || {};

		// model already initialized
		if( this.__childModels[key] )
			return path ? this.__childModels[key].get(path) : this.__childModels[key];

		// get the collection info for setup and determine if a Collection was given
		var info = this._childModel(key);

		// is CollInfo a function (but not a Collection)? Call it to get the info
		if( info && _.isFunction(info) && info.prototype && !info.prototype.toJSON && !info.prototype.fetch )
			info = info()

		// was a model given? (instead of a hash {})
		var infoIsModel = info && info.prototype && info.prototype.toJSON && info.prototype.fetch;

		var ChildModel = infoIsModel ? info : (info.model ? info.model : Backbone.Model);

		// look for model attributes on this model
		var attributes = this.attributes[key] && _.isObject(this.attributes[key]) ? this.attributes[key] : {};

		// were we given an ID key? get the id from the attributes on this model
		if( info.id ) attributes[ChildModel.prototype.idAttribute] = this.attributes[info.id];

		var id = attributes[ChildModel.prototype.idAttribute];
		
		// cannot get a model, no value for ID
		if( info.id && !id ) return null;

		// if a parent collection was given, attempt to lookup the model (or create it)
		if( id && info.coll ){
			var Model = info.fetch ? info.coll.getOrFetch(id, this._childModelFetched.bind(this, key)) : info.coll.getOrCreate(id)

		// else, no collection, manually create the model
		}else{
			var Model = new ChildModel(attributes)
			if( info.fetch && id ) Model.fetch({success:this._childModelFetched.bind(this, key)});
		}

		Model.parentModel = this;

		this.__childModels[key] = Model;

		return path && Model ? Model.get(path) : Model
	},

	_childModelFetched: function(key, model){
		// delay to allow for the model to save: `this.__childModels[key] = Model;`
		_.defer(function(){
			this.trigger('model:'+key+':fetch', model)
		}.bind(this))
	},

	_set: Backbone.Model.prototype.set,
	
	set: function(key, val, options){
		
		var attrs, self = this;
		
		if (_.isObject(key)) {
			attrs = key;
			options = val;
		} else {
			(attrs = {})[key] = val;
		}
		
		// if `key` is a child collection, update it
		if( self.__childCollections )
		_.each(attrs, function(val, key){
			if( self.__childCollections[key] )
				self.__childCollections[key].update(val);
		})
		
		// if `key` is a child model, clear the model to force `getModel` to run again
		if( self.__childModels )
		_.each(attrs, function(val, key){
			if( self.__childModels[key] )
				delete self.__childModels[key];
		})
		
		// continue on with normal `set` logic
		return Backbone.Model.prototype._set.apply(this, arguments);
	}
	
})
