exports.up = async (knex) => {
  await knex.raw('CREATE EXTENSION pg_trgm');
  await knex.raw('CREATE INDEX entities_name_trgm_index ON entities USING gin(name gin_trgm_ops)');
};

exports.down = async (knex) => {
  await knex.raw('DROP EXTENSION pg_trgm');
  await knex.raw('DROP INDEX entities_name_trgm_index');
};
