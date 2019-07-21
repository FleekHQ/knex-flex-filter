# Knex Flex Filter

## Introduction

Knex Flex Filter is a no-dependency package that adds dynamic filter functionality to Knex.

For example, if you have a table or a list in your client side, you can send the server side a `{'price_gt', 100}` param that can be directly interpreted by Knex Flex Filter to filter resources where the price column is greater than 100.

## Installation

```bash
npm add knex-flex-filter
```

Or

```bash
yarn add knex-flex-filter
```

## Usage

```javascript
import knexFlexFilter from 'knex-flex-filter'; // Or const {knexFlexFilter} = require('knex-flex-filter)

// baseQuery can be any Knex query
const baseQuery = knex('my_entity');

// where must be an object with format <columnName>_<filter>: <value>
// It will usually be given by the client
const where = {
  price_gt: 10,
  name_not_in: ['a', 'b'],
};

const opts = {};

knexFlexFilter(baseQuery, where, opts).then(result => console.log(result));
// Will produce a query like whereRaw('"price" > ?', [10]).whereRaw('"name" <> ANY(?)', [['a', 'b']])
```

## Available filters

Current available filters are:

```
  <columnName>_eq: Equal
  <columnName>_gt: Greater than
  <columnName>_lt: Less than
  <columnName>_in: In (Receives an array of values)
  <columnName>_not: Not equal
  <columnName>_gte: Greater than or equal
  <columnName>_lte: Less than or equal
  <columnName>_not_in: Not in (Receives an array of values)
  <columnName>_contains: String contains
  <columnName>_not_contains: String not contains
  <columnName>_starts_with: String starts with
  <columnName>_not_starts_with: String does not start with
  <columnName>_ends_with: String ends with
  <columnName>_not_ends_with: String does not end with
  <columnName>_similar_to: String is similar to
```

By default filters are combined with an `AND` clause, if you want to perform an `OR` filtering on some column, you would need to use the `OR` group filtering.

## Group filters
Group filtering allows for grouping of filters in AND and OR logics using an array of filters. For example, let say we want to filter on a query like `age = 10 AND (height > 5 or weight > 10)`, then your filter object would look like this:

```javascript
{
  height_eq: 5,
  OR: [
    {
      height_gt: 5
    },
    {
      weight_gt: 10
    }
  ] 
}
```

### Note

`similar_to` filter requires Postgres `pg_trgm` extension. A migration that creates the extension and creates a GIN index for faster "similar to" queries can look like this:

```javascript
exports.up = async (knex) => {
  await knex.raw('CREATE EXTENSION pg_trgm');
  await knex.raw('CREATE INDEX posts_title_trgm_index ON posts USING gin(title gin_trgm_ops)');
};

exports.down = async (knex) => {
  await knex.raw('DROP EXTENSION pg_trgm');
  await knex.raw('DROP INDEX posts_title_trgm_index');
};

```

## Options

### castFn

Used to cast the db data before comparing it.

`castFn` receives the column name and returns the cast that should be applied to that column. If no cast is required, `castFn` must return `undefined`.

For example, if you have column named `price`, but stored as a string in the db and want to cast it to integer for number comparison, you can do:

```javascript
...

const opts = {
  castFn = (column) => {
    switch (column) {
      case 'price':
        return 'integer';
      default:
        return undefined;
    };
  };
};

knexFlexFilter(baseQuery, where, opts).then(result => console.log(result));
```

Available cast types are:

```javascript
'integer'
'bigint'
'numeric'
'float'
'boolean'
'date'
'time'
'timestamp'
'timestampz'
'interval'
'double'
'char'
'varchar'
'text'
'uuid'
```

### preprocessor

Useful to transform the query before execution. `preprocessor` receives the name of the column and must return a sanitized raw query string.

Knex Flex Filter currently provides `defaultPreprocessor()` and `jsonbPreprocessor(jsonbColumn)`. `defaultPreprocessor` is applied by default and just sanitizes the data. `jsonbPreprocessor` can be used to filter within `json` or `jsonb` stored data. The usage is the following:

```javascript
import { knexFlexFilter, jsonbPreprocessor } from 'knex-flex-filter';
...

const opts = {
  preprocessor: jsonbPreprocessor('myJsonbColumn')
};

knexFlexFilter(baseQuery, where, opts).then(result => console.log(result));
// Will produce a query like whereRaw("myJsonbColumn->>'a' > ?")
```

### isAggregateFn

Use this function when trying to filter over a query that has an aggregate function (sum, count, etc.). It receives the column name and must return true if it's an aggregate column and false otherwise. Must be used together with `preprocessor`, as aggregate functions are filtered using `having`, which takes the operation instead of the alias.

For example:

```javascript
const baseQuery = knex.table('entities').sum('ownerId as ownerIdSum').groupBy('id');
const isAggregateFn = column => column === 'ownerIdSum';
const preprocessor = column => (column === 'ownerIdSum' ? 'sum("ownerId")' : column);

const query = knexFlexFilter(
  aggregatedQuery,
  { ownerIdSum_eq: 1 },
  { castFn, isAggregateFn, preprocessor }
);
```

### caseInsensitiveSearch

Set to `true` if you want to use insensitive-case searches when using `contains` or `starts_with` filters. Defaults to false.

### conditionMapper
Useful to transform/change the default operator or condition that a 
particular filter is being evaluated against. `conditionMapper` receives the column name, the condition being evaluated and the default/normal value that should returned for the condition.

For example, here we change the `contains` condition to use json containment operator `@>`:

```javascript
import { knexFlexFilter, CONTAINS } from 'knex-flex-filter';
...

const opts = {
  conditionMapper: (column, condition, defaultValue) => {
    if (condition === CONTAINS) {
      return '@> ?';
    }

    return defaultValue;
  }
}

knexFlexFilter(baseQuery, where, opts).then(console.log);
```

### columnQueryOverrides

This should only be used as a last resort for modification of the query.
It is useful to override/bypass the internal logic for handling query conditions for a column and filter.
It is an object who's keys should correspond to the column name you want to override its query.

For example, let's say we want to filter on a JSONB column named `meta` to not contain 
a object. Currently, the library handles not filters using `<>` and this is not always ideal. Code:

```javascript
import { knexFlexFilter, NOT } from 'knex-flex-filter';
...

const opts = {
  columnQueryOverrides: {
    meta: (baseQuery, column, condition, value) => {
    if (condition !== NOT) {
      // return falsy to bypass this override and use normal library logic
      return false; 
    }

    // now we can do proper NOT contains query on the meta column
    return baseQuery.whereNot(column, '@>', value);
  }
}

knexFlexFilter(baseQuery, where, opts).then(console.log);
```

## Contributing

Make sure all the tests pass before sending a PR. To run the test suite, run `yarn test`. Please note that the codebase is using `dotenv` package to connect to a test db, so, to connect to your own, add a `.env` file inside the `tests` folder with the following structure:

```
# knex-flex-filter/tests/.env
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=knex-flex-filter
```