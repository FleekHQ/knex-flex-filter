export const EQ = 'eq';
export const GT = 'gt';
export const LT = 'lt';
export const IN = 'in';
export const NOT = 'not';
export const GTE = 'gte';
export const LTE = 'lte';
export const NOT_IN = 'not_in';

export const filterArray = [
  EQ,
  GT,
  LT,
  NOT_IN,
  IN,
  NOT,
  GTE,
  LTE,
];

const conditionMap = {
  [EQ]: '= ?',
  [GT]: '> ?',
  [LT]: '< ?',
  [NOT_IN]: '<> ANY(?)',
  [IN]: '= ANY(?)',
  [NOT]: '<> ?',
  [GTE]: '>= ?',
  [LTE]: '<= ?',
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

export const defaultPreprocessor = () => filterKey => `"${sanitize(filterKey)}"`;

export const jsonbPreprocessor = jsonbColumn => filterKey => `${sanitize(jsonbColumn)}->>'${sanitize(filterKey)}'`;

export const splitColumnAndCondition = (filterQS) => {
  // Search for the current filter
  const condition = filterArray.find(filter => filterQS.endsWith(filter));

  if (!condition) {
    throw Error(`Invalid filter '${filterQS}' supplied to query. Valid suffixes are ${JSON.stringify(filterArray)}`);
  }

  // column is going to be the actual column we are filtering on
  const column = filterQS.substring(0, filterQS.indexOf(condition) - 1);

  return { column, condition };
};

const processFilter = (filterQS, castFn, preprocessor) => {
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

  return `${query} ${conditionMap[condition]}`;
};


export const knexFlexFilter = (originalQuery, where = {}, opts = {}) => {
  const { castFn, preprocessor = defaultPreprocessor() } = opts;

  let result = originalQuery;

  Object.keys(where).forEach((key) => {
    const query = processFilter(key, castFn, preprocessor);
    result = result.whereRaw(query, [where[key]]);
  });

  return result;
};

export default knexFlexFilter;
