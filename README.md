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
import knexFlexFilter from 'knex-flex-filter' // Or const {knexFlexFilter} = require('knex-flex-filter)

// baseQuery can be any Knex query
const baseQuery = knex('my_entity');

// where must be an object with format <columnName>_<filter>: <value>
// It will usually be given by the client
const where = {
  price_gt: 10,
  name_not_in: ['a', 'b'],
}

const opts = {}

knexFlexFilter(baseQuery, where, opts).then(result => console.log(result)) // Or even better if you use await!
```

## Options

### Type casting

### Preprocessing