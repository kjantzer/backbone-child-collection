
// TODO: let `id` be a hash of attributes
module.exports = function(id, opts){

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

		var model = new ModelClass(data);

		model.needsFetching = true;

		// add model to this collection
		if( !opts || opts.add !== false )
			this.add(model, {silent:(opts&&opts.silent||false)});
		else
			model.collection = this;
	}

	return model;
}