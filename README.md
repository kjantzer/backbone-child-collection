# Backbone Child Collection 0.10.0

![Version 0.10.0](https://img.shields.io/badge/Version-0.10.0-blue.svg)

> Create simple relations between models and collections with limited overhead.

## Example

#### Child Collection

```js
var Employees = Backbone.ChildCollection.extend({
	// url path will be appended to the url of the parent model
	urlPath: 'employees'
})

var Company = Backbone.Model.extend({
	urlRoot: '/api/company'
	
	name: 'company', // see below how this is used
	
	// setup all child collections with a key
	collections: {
		'employees': Employees
	}
});

var myCompany = new Company({id: 1, name: 'My Company'});

console.log( myCompany.get('employees').url() ) // = /api/company/1/employees

// child collections have reference back to parent model
var employeeColl = myCompany.get('employees');

console.log( employeeColl.parentModel == myCompany ) // true

// create employee models – POST: /api/company/1/employees
myCompany.get('employees').create([
	{id: 1, name: 'John Doe'},
	{id: 2, name: 'Jane Doe'}
])

var firstEmployee = myCompany.get('employees').first()

// child models inside the child collections can traverse to the parent model
firstEmployee.collection.parentModel == myCompany // true

// of if you give the parent model a `name`, you can do this
firstEmployee.get('company') == myCompany // true

```

#### Child Model

```js
// Setup a computer model with a link to a single employee model
var Computer = Backbone.Model.extend({
	models: {
		'employee': {id: 'employee_id', coll: myCompany.get('employees')}
	}
});

var computer = new Computer({'employee_id':'1'})

console.log( computer.get('employee') ) // John Doe Model
console.log( computer.get('employee').get('name') ) // "John Doe"

```

## Documentation

#### Model Attributes and Collection Keys

Model attributes and collection keys should not conflict unless you are wanting to preload the collection with data. If they keys are the same, the child collection with be returned and not the model attribute. However, if the model attribute is an array it will be added to the child collection.

```js
var jsonModelData = {
	id: 1,
	name: 'My Company',
	
	// this matches the child collection key,
	// so when `get(employees)` is used, this data will be converted into a real collection
	employees: [
		{name: 'Bob'},
		{name: 'Jill'}
	]
}

// using the example from above...
var myCompany = new Company(jsonModelData);

// returns collection with two employees, Bob and Jill
myCompany.get('employees');
```

#### Collections setup

You start by putting a list of `collections` on your model. *Multiple structures are supported.*

```js
collections: {
        'employees': 'employees', // urlPath will be set with generic ChildCollection
        'employees': EmployeesColl,
        'employees': {
                collection: EmployeesColl,
                ... // any other options listed here will be passed to collection on init
        },
        'employees': function(){ return EmployeesColl },
        'employees': function(){ return {
                collection: EmployeesColl,
        }}
}
```

#### Models setup

Sometimes you may want to translate a related ID to a real Model. To do this, setup `models`. Like Collections, you can specify a hash or a function that returns a hash

```js
/* assuming your model looks like:
	{
		id: 1, 
		employee_id: 1,
		more: 'attrs'
	}
*/
models: {
	'employee': {
		id: 'employee_id', // the attribute on the model,
		coll: EmployeesColl // where to lookup the id
		
		// optional
		fetch: true // if `id` isn't found, it will be fetched from server
	}
}

// later: `.get('employee')` == model
```

Models will also work by having the entire model attributes rather than just and ID. Like so...

```js
/* assuming your model looks like:
	{
		id: 1, 
		employee: {
			id: 1,
			name: 'John Doe',
			more: 'attrs'
		},
		more: 'attrs'
	}
*/
models: {
	'employee': Employee // will turn the attrs into a real Model
}

// later: `.get('employee')` == model
```


#### Properties and methods available

`[Collection/Model].parentModel` – a reference to the parent model of this collection/model

`Collection.urlPath` – the path to be appended to the URL of the parent model.

`[Collection/Model].hasFetched` (BOOL) – Is set to `true` after a `fetch` happens.

`[Collection/Model].isFetching` (BOOL) – Will be set to `true` while the `fetch` method is happening.

`Collection.fetchOnce()` – Fetches collection if it has not been fetched yet. (Tests for `hasFetched`)

`Collection.timeSinceLastFetch()` - Time in miliseconds since last fetched

`Collection.stale` - if set, `fetch` will only make request once data is given `ms` stale.

`Collection.fetch({stale:10000})` - Overrides `.stale` option to signify when the collection data becomes stale. A `fetch` request will not follow through until the data is stale.

`Model.needsFetching`

### Dot Notation

Dot notation is supported when getting child collections and models.

```js
// collections can return a specific model by providing an index
myCompany.get('employees.0.name')
// aka
myCompany.get('employees').at(0).get('name')

// `first` and `last` are also supported
myCompany.get('employees.first.name')
myCompany.get('employees.last.name')
```

A benefit of using dot notation is if a nested item does not exist a fatal error will not occur.

## License

MIT © [Kevin Jantzer](http://kevinjantzer.com)
