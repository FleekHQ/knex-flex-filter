export const EQ = 'eq';
export const GT = 'gt';
export const LT = 'lt';
export const IN = 'in';
export const NOT = 'not';
export const GTE = 'gte';
export const LTE = 'lte';
export const NOT_IN = 'not_in';
export const CONTAINS = 'contains';
export const NOT_CONTAINS = 'not_contains';
export const STARTS_WITH = 'starts_with';
export const NOT_STARTS_WITH = 'not_starts_with';
export const ENDS_WITH = 'ends_with';
export const NOT_ENDS_WITH = 'not_ends_with';
export const SIMILAR_TO = 'similar_to';
export const OR_QUERY = 'or_';
export const AND_QUERY = 'and_';

export const filterArray = [
  EQ,
  GT,
  LT,
  NOT_IN,
  IN,
  NOT_CONTAINS,
  CONTAINS,
  NOT_STARTS_WITH,
  STARTS_WITH,
  NOT_ENDS_WITH,
  ENDS_WITH,
  SIMILAR_TO,
  NOT,
  GTE,
  LTE,
];

export const queryTypesArray = [OR_QUERY, AND_QUERY];

const conditionMap = {
  [EQ]: '= ?',
  [GT]: '> ?',
  [LT]: '< ?',
  [NOT_IN]: '<> ANY(?)',
  [IN]: '= ANY(?)',
  [NOT_CONTAINS]: "NOT LIKE '%?%'",
  [CONTAINS]: "LIKE '%?%'",
  [NOT_STARTS_WITH]: "NOT LIKE '?%'",
  [STARTS_WITH]: "LIKE '?%'",
  [NOT_ENDS_WITH]: "NOT LIKE '%?'",
  [ENDS_WITH]: "LIKE '%?'",
  [SIMILAR_TO]: '% ?',
  [NOT]: '<> ?',
  [GTE]: '>= ?',
  [LTE]: '<= ?',
};

const queryTypeFnMap = {
  [AND_QUERY]: 'whereRaw',
  [OR_QUERY]: 'orWhereRaw',
};

export const dbTypes = [
  'integer',
  'bigint',
  'numeric',
  'float',
  'boolean',
  'date',
  'time',
  'timestamp',
  'timestampz',
  'interval',
  'double',
  'char',
  'varchar',
  'text',
  'uuid',
  '',
  // TODO @dmerrill6: fill out with other possible casts
];

const sanitize = identifier => identifier.replace(/([^A-Za-z0-9_]+)/g, '');

const getCondition = (conditionMapper, column, condition) => {
  let currCondition = conditionMap[condition];
  if (conditionMapper) {
    const mappedCondition = conditionMapper(column, condition, currCondition);
    if (mappedCondition) {
      currCondition = mappedCondition;
    }
  }

  return currCondition;
};

export const defaultPreprocessor = () => filterKey => `"${sanitize(filterKey)}"`;

export const jsonbPreprocessor = jsonbColumn => filterKey => `${sanitize(jsonbColumn)}->>'${sanitize(filterKey)}'`;

export const splitColumnAndCondition = (filterQS) => {
  // search for pre conditions
  const queryType = queryTypesArray.find(pre => filterQS.startsWith(pre));

  // Search for the current filter
  const condition = filterArray.find(filter => filterQS.endsWith(filter));

  if (!condition) {
    throw Error(`Invalid filter '${filterQS}' supplied to query. Valid suffixes are ${JSON.stringify(filterArray)}`);
  }

  // column is going to be the actual column we are filtering on
  const colStartIndex = (queryType) ? queryType.length : 0;
  const column = filterQS.substring(colStartIndex, filterQS.indexOf(condition) - 1);

  return { column, condition, queryType: queryType || AND_QUERY };
};

const processFilter = (filterQS, castFn, preprocessor, conditionMapper) => {
  const { column, condition } = splitColumnAndCondition(filterQS);

  const preprocessed = preprocessor(column);
  let query = preprocessed;

  // If there is a cast function, check if there is a cast available for the current filter
  if (castFn) {
    const cast = castFn(column);
    if (!dbTypes.includes(cast)) {
      throw Error(`Invalid cast type '${cast}' supplied to query. Valid casts are ${dbTypes}`);
    }
    if (cast) query = `(${preprocessed})::${cast}`;
  }

  const currCondition = getCondition(conditionMapper, column, condition);
  if (currCondition.includes('??')) {
    return currCondition.replace('??', query);
  }

  return `${query} ${currCondition}`;
};


export const knexFlexFilter = (originalQuery, where = {}, opts = {}) => {
  const {
    castFn,
    preprocessor = defaultPreprocessor(),
    isAggregateFn,
    caseInsensitiveSearch = false,
    conditionMapper,
  } = opts;

  let result = originalQuery;

  Object.keys(where).forEach((key) => {
    let query = processFilter(key, castFn, preprocessor, conditionMapper);
    const { column, condition, queryType } = splitColumnAndCondition(key);
    let queryFn = queryTypeFnMap[queryType];
    if (isAggregateFn) {
      if (isAggregateFn(column)) {
        queryFn = 'havingRaw';
      }
    }
    let value = where[key];

    // Escape apostrophes correctly
    const matchEscape = getCondition(conditionMapper, column, condition).match(/'(.*)\?(.*)'/);
    if (matchEscape) {
      // eslint-disable-next-line no-unused-vars
      const [_, pre, post] = matchEscape;
      value = `${pre}${value}${post}`;
      query = query.replace(/(.*)'.*\?.*'(.*)/, '$1?$2');
    }

    if (caseInsensitiveSearch) {
      query = query.replace('LIKE', 'ILIKE');
    }

    result = result[queryFn](query, [value]);
  });

  return result;
};

export default knexFlexFilter;
