# Backbone Child Collection 0.2.0

> Used for REST collection that is child of a parent model.

## Example

```js

var Employee = Backbone.Model.extend()
var Employees = Backbone.ChildCollection.extend({
	model: Employee,
	urlPath: 'employees'
})

var Company = Backbone.Model.extend({
	
	urlRoot: '/api/company'

	collections: {
		'employees': Employees
	}
	
});

var myCompany = new Company({id: 1, name: 'My Company'});

myCompany.getCollection('employees') // returns collection of company employees

// you can also use the normal `get` method.
// If no attribute exists with that name, the collection will be returned
myCompany.get('employees')

myCompany.get('employees').url() // = /api/company/1/employees


// child collections have reference back to parent model
var employeeColl = myCompany.get('employees');

employeeColl.parentModel == myCompany // true

```

## Documentation

#### Model Attributes and Collection Keys

Model attributes and collection keys should not conflict unless you are wanting to preload the collection with data. If they keys are the same, the child collection with be returned and not the model attribute. However, if the model attribute is an array it will be added to the child collection.

```js
// using the example from above...
var myCompany = new Company({
	id: 1,
	name: 'My Company',
	
	// this conflicts with the child collection key, so will be used by the collection
	employees: [
		{name: 'Bob'},
		{name: 'Jill'}
	]
});

// returns collection with two employees, Bob and Jill
myCompany.get('employees');
```

## License

MIT © [Kevin Jantzer](http://kevinjantzer.com)
