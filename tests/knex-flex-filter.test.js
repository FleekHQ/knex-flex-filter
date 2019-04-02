
import seedsFn from './helpers/seeds';
import knex from './knex';
import knexFlexFilter, { jsonbPreprocessor } from '../src';

require('./helpers/database');


describe('knex-flex-filter', () => {
  let castFn;

  beforeEach(async (done) => {
    await seedsFn(knex);
    castFn = (arg) => {
      switch (arg) {
        case 'ownerId':
          return 'bigint';
        case 'lastBuyBlockNumber':
          return 'bigint';
        default:
          return '';
      }
    };
    done();
  });

  describe('when filtering a normal column', () => {
    it('correctly filters by _eq', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_eq: 1 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint = ?');
      expect(query._statements[0].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerId, 10)).toEqual(1);
      done();
    });

    it('correctly filters by _gt', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_gt: 0 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint > ?');
      expect(query._statements[0].value.bindings).toEqual([0]);

      const result = await query;
      expect(parseInt(result[0].ownerId, 10)).toBeGreaterThan(0);
      done();
    });

    it('correctly filters by _lt', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_lt: 2 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint < ?');
      expect(query._statements[0].value.bindings).toEqual([2]);

      const result = await query;
      expect(parseInt(result[0].ownerId, 10)).toBeLessThan(2);
      done();
    });

    it('correctly filters by _in', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_in: [1, 2] }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint = ANY(?)');
      expect(query._statements[0].value.bindings).toEqual([[1, 2]]);

      const result = await query;
      expect([1, 2]).toContain(parseInt(result[0].ownerId, 10));
      done();
    });

    it('correctly filters by _not', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_not: 2 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint <> ?');
      expect(query._statements[0].value.bindings).toEqual([2]);

      const result = await query;
      expect(result.map(_schema => parseInt(_schema.ownerId, 10))).not.toContain(2);
      done();
    });

    it('correctly filters by _gte', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_gte: 1 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint >= ?');
      expect(query._statements[0].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerId, 10)).toBeGreaterThanOrEqual(1);
      done();
    });

    it('correctly filters by _lte', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_lte: 1 }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint <= ?');
      expect(query._statements[0].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerId, 10)).toBeLessThanOrEqual(1);
      done();
    });

    it('correctly filters by _not_in', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { ownerId_not_in: [2, 3] }, { castFn });

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint <> ANY(?)');
      expect(query._statements[0].value.bindings).toEqual([[2, 3]]);

      const result = await query;
      expect([2, 3]).not.toContain(parseInt(result[0].ownerId, 10));
      done();
    });

    it('correctly filters by contains', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_contains: 'rick' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('to_tsvector("name") @@ to_tsquery(?)');
      expect(query._statements[0].value.bindings).toEqual(['rick']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Rick');
      done();
    });

    it('correctly filters by not contains', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_not_contains: 'rick' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('to_tsvector("name") @@ to_tsquery(?)');
      expect(query._statements[0].value.bindings).toEqual(['!rick']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name).sort()).toEqual(['John Doe', 'Peter Jackson'].sort());
      done();
    });

    it('correctly filters by starts with', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_starts_with: 'John' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('"name" LIKE ?');
      expect(query._statements[0].value.bindings).toEqual(['John%']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].name).toMatch(/^John/);
      done();
    });

    it('correctly filters by not starts with', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_not_starts_with: 'John' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('"name" NOT LIKE ?');
      expect(query._statements[0].value.bindings).toEqual(['John%']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result[0].name).not.toMatch(/^John/);
      expect(result[1].name).not.toMatch(/^John/);
      done();
    });

    it('correctly filters by ends with', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_ends_with: 'Doe' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('"name" LIKE ?');
      expect(query._statements[0].value.bindings).toEqual(['%Doe']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].name).toMatch(/Doe$/);
      done();
    });

    it('correctly filters by not ends with', async (done) => {
      const query = knexFlexFilter(knex.table('entities'), { name_not_ends_with: 'Doe' }, { castFn });

      expect(query._statements[0].value.sql).toEqual('"name" NOT LIKE ?');
      expect(query._statements[0].value.bindings).toEqual(['%Doe']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result[0].name).not.toMatch(/Doe$/);
      expect(result[1].name).not.toMatch(/Doe$/);
      done();
    });

    it('correctly filters by multiple filters at once', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        {
          ownerId_not_in: [1],
          ownerId_gt: 2,
        },
        { castFn },
      );

      expect(query._statements[0].value.sql).toEqual('("ownerId")::bigint <> ANY(?)');
      expect(query._statements[0].value.bindings).toEqual([[1]]);
      expect(query._statements[1].value.sql).toEqual('("ownerId")::bigint > ?');
      expect(query._statements[1].value.bindings).toEqual([2]);

      const result = await query;
      expect([1]).not.toContain(parseInt(result[0].ownerId, 10));
      expect(parseInt(result[0].ownerId, 10)).toBeGreaterThan(2);
      done();
    });
  });

  describe('when filtering an aggregate column', () => {
    let aggregatedQuery;
    let isAggregateFn;
    let preprocessor;
    beforeEach(() => {
      aggregatedQuery = knex.table('entities').sum('ownerId as ownerIdSum').groupBy('id');
      isAggregateFn = column => column === 'ownerIdSum';
      preprocessor = column => (column === 'ownerIdSum' ? 'sum("ownerId")' : column);
    });

    it('correctly filters by _eq', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_eq: 1 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") = ?');
      expect(query._statements[2].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerIdSum, 10)).toEqual(1);
      done();
    });

    it('correctly filters by _gt', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_gt: 0 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") > ?');
      expect(query._statements[2].value.bindings).toEqual([0]);

      const result = await query;
      expect(parseInt(result[0].ownerIdSum, 10)).toBeGreaterThan(0);
      done();
    });

    it('correctly filters by _lt', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_lt: 2 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") < ?');
      expect(query._statements[2].value.bindings).toEqual([2]);

      const result = await query;
      expect(parseInt(result[0].ownerIdSum, 10)).toBeLessThan(2);
      done();
    });

    it('correctly filters by _in', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_in: [1, 2] }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") = ANY(?)');
      expect(query._statements[2].value.bindings).toEqual([[1, 2]]);

      const result = await query;
      expect([1, 2]).toContain(parseInt(result[0].ownerIdSum, 10));
      done();
    });

    it('correctly filters by _not', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_not: 2 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") <> ?');
      expect(query._statements[2].value.bindings).toEqual([2]);

      const result = await query;
      expect(result.map(_schema => parseInt(_schema.ownerIdSum, 10))).not.toContain(2);
      done();
    });

    it('correctly filters by _gte', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_gte: 1 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") >= ?');
      expect(query._statements[2].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerIdSum, 10)).toBeGreaterThanOrEqual(1);
      done();
    });

    it('correctly filters by _lte', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_lte: 1 }, { castFn, isAggregateFn, preprocessor });

      expect(query._statements[2].value.sql).toEqual('sum("ownerId") <= ?');
      expect(query._statements[2].value.bindings).toEqual([1]);

      const result = await query;
      expect(parseInt(result[0].ownerIdSum, 10)).toBeLessThanOrEqual(1);
      done();
    });

    // TODO @dmerrill6: Fix this test as it's not passing
    xit('correctly filters by _not_in', async (done) => {
      const query = knexFlexFilter(aggregatedQuery, { ownerIdSum_not_in: [2, 3] }, { castFn, isAggregateFn, preprocessor });
      console.log(query.toString());
      expect(query._statements[2].value.sql).toEqual('sum("ownerId") <> ANY(?)');
      expect(query._statements[2].value.bindings).toEqual([[2, 3]]);

      const result = await query;
      console.log('result', result);
      expect([2, 3]).not.toContain(parseInt(result[0].ownerIdSum, 10));
      done();
    });
  });

  describe('when filtering using the jsonb preprocessor', () => {
    const BLOCK_NUMBER = 5000;

    it('correctly filters by _eq', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_eq: BLOCK_NUMBER },
        { preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("data->>'lastBuyBlockNumber' = ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toEqual(BLOCK_NUMBER);
      done();
    });

    it('correctly filters by _gt', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_gt: BLOCK_NUMBER - 1 },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint > ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER - 1]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeGreaterThan(BLOCK_NUMBER - 1);
      done();
    });

    it('correctly filters by _lt', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_lt: BLOCK_NUMBER + 1 },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint < ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER + 1]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeLessThan(BLOCK_NUMBER + 1);
      done();
    });

    it('correctly filters by _in', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_in: [BLOCK_NUMBER, BLOCK_NUMBER + 1] },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint = ANY(?)");
      expect(query._statements[0].value.bindings).toEqual([[BLOCK_NUMBER, BLOCK_NUMBER + 1]]);

      const result = await query;
      expect([BLOCK_NUMBER, BLOCK_NUMBER + 1]).toContain(parseInt(result[0].data.lastBuyBlockNumber, 10));
      done();
    });

    it('correctly filters by _not', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_not: BLOCK_NUMBER + 1 },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint <> ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER + 1]);

      const result = await query;
      expect(result.map(_schema => parseInt(_schema.lastBuyBlockNumber, 10))).not.toContain(BLOCK_NUMBER + 1);
      done();
    });

    it('correctly filters by _gte', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_gte: BLOCK_NUMBER },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint >= ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeGreaterThanOrEqual(BLOCK_NUMBER);
      done();
    });

    it('correctly filters by _lte', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_lte: BLOCK_NUMBER },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint <= ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeLessThanOrEqual(BLOCK_NUMBER);
      done();
    });

    it('correctly filters by _not_in', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { lastBuyBlockNumber_not_in: [BLOCK_NUMBER + 1, BLOCK_NUMBER + 2] },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint <> ANY(?)");
      expect(query._statements[0].value.bindings).toEqual([[BLOCK_NUMBER + 1, BLOCK_NUMBER + 2]]);

      const result = await query;
      expect([BLOCK_NUMBER + 1, BLOCK_NUMBER + 2]).not.toContain(parseInt(result[0].data.lastBuyBlockNumber, 10));
      done();
    });

    it('correctly filters by contains', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_contains: 'rick' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("to_tsvector(data->>'name') @@ to_tsquery(?)");
      expect(query._statements[0].value.bindings).toEqual(['rick']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].data.name).toContain('Rick');
      done();
    });

    it('correctly filters by not contains', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_not_contains: 'rick' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("to_tsvector(data->>'name') @@ to_tsquery(?)");
      expect(query._statements[0].value.bindings).toEqual(['!rick']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result.map(r => r.data.name).sort()).toEqual(['John Doe', 'Peter Jackson'].sort());
      done();
    });

    it('correctly filters by starts with', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_starts_with: 'John' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("data->>'name' LIKE ?");
      expect(query._statements[0].value.bindings).toEqual(['John%']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].data.name).toMatch(/^John/);
      done();
    });

    it('correctly filters by not starts with', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_not_starts_with: 'John' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("data->>'name' NOT LIKE ?");
      expect(query._statements[0].value.bindings).toEqual(['John%']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result[0].data.name).not.toMatch(/^John/);
      expect(result[1].data.name).not.toMatch(/^John/);
      done();
    });

    it('correctly filters by ends with', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_ends_with: 'Doe' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("data->>'name' LIKE ?");
      expect(query._statements[0].value.bindings).toEqual(['%Doe']);

      const result = await query;

      expect(result).toHaveLength(1);
      expect(result[0].data.name).toMatch(/Doe$/);
      done();
    });

    it('correctly filters by not ends with', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        { name_not_ends_with: 'Doe' },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("data->>'name' NOT LIKE ?");
      expect(query._statements[0].value.bindings).toEqual(['%Doe']);

      const result = await query;

      expect(result).toHaveLength(2);
      expect(result[0].data.name).not.toMatch(/Doe$/);
      expect(result[1].data.name).not.toMatch(/Doe$/);
      done();
    });

    it('correctly filters by multiple filters at once', async (done) => {
      const query = knexFlexFilter(
        knex.table('entities'),
        {
          lastBuyBlockNumber_gt: BLOCK_NUMBER,
          lastBuyBlockNumber_lt: BLOCK_NUMBER + 2,
        },
        { castFn, preprocessor: jsonbPreprocessor('data') },
      );

      expect(query._statements[0].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint > ?");
      expect(query._statements[0].value.bindings).toEqual([BLOCK_NUMBER]);
      expect(query._statements[1].value.sql).toEqual("(data->>'lastBuyBlockNumber')::bigint < ?");
      expect(query._statements[1].value.bindings).toEqual([BLOCK_NUMBER + 2]);

      const result = await query;
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeGreaterThan(BLOCK_NUMBER);
      expect(parseInt(result[0].data.lastBuyBlockNumber, 10)).toBeLessThan(BLOCK_NUMBER + 2);
      done();
    });
  });
});
