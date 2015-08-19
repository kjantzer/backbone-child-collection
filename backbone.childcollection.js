/*
	Backbone Child Collection 0.1.0
	
	Used for REST collection that is child of a parent model.
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2015-07-08
	
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
		
		if( this.attributes[key] != null || !this.collections || !this.collections[key] )
			return Backbone.Model.prototype._get.apply(this, arguments)
		
		return this.getCollection(key);
	},
	
	getCollection: function(key){
		
		this.__childCollections = this.__childCollections || {};
		
		// collection already initialized
		if( this.__childCollections[key] )
			return this.__childCollections[key];
		
		var CollInfo = this.collections && this.collections[key];
		var CollGiven = CollInfo && CollInfo.prototype && CollInfo.prototype.toJSON && CollInfo.prototype.fetch;
		
		if( !CollInfo ){
			console.warn('Collection for `'+key+'` not set.',  this.collections)
			return null;
		}
		
		var ChildColl = CollGiven ? CollInfo : (CollInfo.collection ? CollInfo.collection : Backbone.ChildCollection);
		
		var opts = {
			parentModel: this
		}
		
		if( typeof CollInfo === 'string' )
			opts.urlPath = CollInfo;
			
		else if( !CollGiven && typeof CollInfo === 'object')
			opts = _.extend(CollInfo, opts);
			
		var Coll = this.__childCollections[key] = new ChildColl([], opts)
		
		Coll.parentModel = this;
		
		return Coll;
	}
	
})
