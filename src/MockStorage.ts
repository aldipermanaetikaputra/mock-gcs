import { BucketOptions } from '@google-cloud/storage';
import MockBucket, { IBucket } from './MockBucket';

export interface IStorage {
  bucket(name: string, options?: BucketOptions): IBucket;
}

export default class MockStorage implements IStorage {
  public buckets: Record<string, MockBucket>;

  public constructor() {
    this.buckets = {};
  }

  public bucket(name: string, options?: BucketOptions): MockBucket {
    if (this.buckets[name] === undefined) {
      this.buckets[name] = new MockBucket(this, name);
    }

    return this.buckets[name];
  }
}
