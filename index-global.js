
Backbone.Collection.prototype.getOrCreate = require('./getOrCreate')
Backbone.Collection.prototype.getOrFetch = require('./getOrFetch')

// we're about to override these, so keep a reference to them
let orig = {
	Set: Backbone.Model.prototype.set,
	Get: Backbone.Model.prototype.get,
	Fetch: Backbone.Model.prototype.fetch
}

Backbone.ChildCollection = Backbone.Collection.extend(require('./child-collection'))

Object.assign(Backbone.Model.prototype, require('./child-model')(orig))