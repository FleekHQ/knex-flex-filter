
export default async (knex) => {
  const entity1 = await knex('entities').insert({
    name: 'John Doe',
    ownerId: 1,
    data: {
      id: '1',
      name: 'John Doe',
      address: '0x2f63f292c01a179e06f5275cfe3278c1efa7a1a2',
      lastBuyBlockNumber: 5000,
    },
  });
  const entity2 = await knex('entities').insert({
    name: 'Peter Jackson',
    ownerId: 2,
    data: {
      id: '2',
      name: 'Peter Jackson',
      address: '0x2f63f292c01a179e06f5275cfe3278c1efa7a1a3',
      lastBuyBlockNumber: 5001,
    },
  });

  const entity3 = await knex('entities').insert({
    name: 'Rick Sanchez',
    ownerId: 3,
    data: {
      id: '3',
      name: 'Rick Sanchez',
      address: '0x2f63f292c01a179e06f5275cfe3278c1efa7a1a4',
      lastBuyBlockNumber: 5002,
    },
  });

  return [entity1, entity2, entity3];
};
