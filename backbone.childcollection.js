/*
	Backbone Child Collection 0.2.0
	
	Used for REST collection that is child of a parent model.
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2015-07-08
	
	https://github.com/kjantzer/backbone-child-collection
	
	TODO
	- what happenns if the parentModel is new? should collection not fetch/save?
*/

Backbone.ChildCollection = Backbone.Collection.extend({
	
	//urlPath: 'extra/path/after/parent-url' // make sure to set this. Can also be set with options
	
	constructor: function(models, options){
	
		this.parentModel = options.parentModel;
		
		if( options.urlPath ) this.urlPath = options.urlPath
		
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
		
		if( !this.urlPath ){
			console.warn('No `urlPath` given for this collection');
			return null;
		}
		
		return url+'/'+this.urlPath
	},
	
	fetch: function(opts){
		
		var opts = opts || {};
		var onSuccess = opts.success || null;
		
		opts.success = function(){
			this.hasFetched = true;
			this.isFetching = false;
			onSuccess && onSuccess.apply(this, arguments)
		}.bind(this)
		
		this.isFetching = true;
		
		Backbone.Collection.prototype.fetch.call(this, opts);
	}
	
});

_.extend(Backbone.Model.prototype, {
	
	childCollection: function(key ){ return this.getCollection(key); }, // alias
	
	_get: Backbone.Model.prototype.get,
	
	// Overrides default to get a collection if no attribute for given `key` exists
	get: function(key){
		
		// no collection found for key, return model attribute like normal
		if( !this.collections || !this.collections[key] )
			return Backbone.Model.prototype._get.apply(this, arguments)
		
		return this.getCollection(key);
	},
	
	getCollection: function(key){
		
		this.__childCollections = this.__childCollections || {};
		
		// collection already initialized
		if( this.__childCollections[key] )
			return this.__childCollections[key];
		
		// get the collection info for setup and determine if a Collection was given
		var CollInfo = this.collections && this.collections[key];
		var CollGiven = CollInfo && CollInfo.prototype && CollInfo.prototype.toJSON && CollInfo.prototype.fetch;
		
		// whoops, couldn't find a collection for the given key
		if( !CollInfo ){
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
		
		// make sure parent model is set on the collection
		Coll.parentModel = this;
		
		return Coll;
	}
	
})
