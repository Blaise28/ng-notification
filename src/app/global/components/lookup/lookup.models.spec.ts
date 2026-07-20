import { extractLookupCount, extractLookupItems } from './lookup.models';

describe('extractLookupItems', () => {
  it('should read items from objects', () => {
    const items = extractLookupItems({
      objects: [{ id: '1', name: 'Champ A' }],
      count: 1,
    });

    expect(items).toEqual([{ id: '1', name: 'Champ A' }]);
  });

  it('should read items from object when objects is absent', () => {
    const items = extractLookupItems({
      object: [{ id: '2', name: 'Champ B' }],
      count: 1,
    });

    expect(items).toEqual([{ id: '2', name: 'Champ B' }]);
  });

  it('should prefer objects over object', () => {
    const items = extractLookupItems({
      objects: [{ id: '1' }],
      object: [{ id: '2' }],
    });

    expect(items).toEqual([{ id: '1' }]);
  });

  it('should return empty array when object is not an array', () => {
    expect(extractLookupItems({ object: { filters: [] } })).toEqual([]);
    expect(extractLookupItems(undefined)).toEqual([]);
  });
});

describe('extractLookupCount', () => {
  it('should read count from response', () => {
    expect(extractLookupCount({ objects: [], count: 5 })).toBe(5);
    expect(extractLookupCount({})).toBe(0);
  });
});
