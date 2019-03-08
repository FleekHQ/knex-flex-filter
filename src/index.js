export const GT = 'gt';
export const LT = 'lt';
export const IN = 'in';
export const NOT = 'not';
export const GTE = 'gte';
export const LTE = 'lte';
export const NOT_IN = 'not_in';

export const filterArray = [
  GT,
  LT,
  NOT_IN,
  IN,
  NOT,
  GTE,
  LTE,
];

const conditionMap = {
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
  'string',
  '',
  // TODO @dmerrill6: fill out with other possible casts
];

const sanitize = identifier => identifier.replace(/([^A-Za-z0-9_]+)/g, '');

export const defaultPreprocessor = () => filterKey => `"${sanitize(filterKey)}"`;

export const jsonbPreprocessor = jsonbColumn => filterKey => `${sanitize(jsonbColumn)}->>'${sanitize(filterKey)}'`;

const processFilter = (filterQS, castFn, preprocessor) => {
  // Search for the current filter
  const filterCondition = filterArray.find(filter => filterQS.endsWith(filter));

  if (!filterCondition) {
    throw Error(`Invalid filter '${filterQS}' supplied to query. Valid suffixes are ${JSON.stringify(filterArray)}`);
  }

  // filterKey is going to be the actual column we are filtering on
  const filterKey = filterQS.substring(0, filterQS.indexOf(filterCondition) - 1);

  const preprocessed = preprocessor(filterKey);
  let query = preprocessed;

  // If there is a cast function, check if there is a cast available for the current filter
  if (castFn) {
    const cast = castFn(filterKey);
    if (!dbTypes.includes(cast)) {
      throw Error(`Invalid cast type '${cast}' supplied to query. Valid casts are ${dbTypes}`);
    }
    if (cast) query = `(${preprocessed})::${cast}`;
  }

  return `${query} ${conditionMap[filterCondition]}`;
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
