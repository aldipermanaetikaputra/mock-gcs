// MockStorage.test.ts

import MockStorage from './MockStorage';
import MockBucket from './MockBucket';

describe('MockStorage', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  describe('bucket', () => {
    it('should create a new bucket if it does not already exist', () => {
      const mockBucket = mockStorage.bucket('test-bucket');

      expect(mockBucket).toBeInstanceOf(MockBucket);
      expect(mockBucket.name).toEqual('test-bucket');
      expect(mockStorage.buckets['test-bucket']).toBe(mockBucket);
    });

    it('should return an existing bucket', () => {
      const existingBucket = new MockBucket(mockStorage, 'existing-bucket');
      mockStorage.buckets['existing-bucket'] = existingBucket;

      const mockBucket = mockStorage.bucket('existing-bucket');

      expect(mockBucket).toBe(existingBucket);
    });
  });
});
