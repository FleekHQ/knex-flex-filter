import Knex from 'knex';

const knexOptions = require('./knexfile');

const knex = Knex(knexOptions.test);

export default knex;
