# Backbone Child Collection 0.1.0

> Used for REST collection that is child of a parent model.

## Example:

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

## License

MIT © [Kevin Jantzer](http://kevinjantzer.com)
