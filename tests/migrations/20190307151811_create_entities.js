
exports.up = async (knex, Promise) => {
  await knex.schema.createTable('entities', (t) => {
    t.increments('id')
      .unsigned()
      .primary();
    t.integer('ownerId').notNull();
    t.string('name').notNull();
    t.jsonb('data').notNull();
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTableIfExists('entities');
};
