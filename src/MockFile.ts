import {
  CreateReadStreamOptions,
  CreateWriteStreamOptions,
  DownloadOptions,
  DownloadResponse,
  FileOptions,
  GetSignedUrlConfig,
  GetSignedUrlResponse,
  SaveOptions,
  CopyOptions,
  CopyResponse,
} from '@google-cloud/storage';
import MockBucket, { IBucket } from './MockBucket';
import { writeFileSync } from 'fs';
import { Readable, Writable } from 'stream';
import {
  DeleteOptions,
  ExistsOptions,
  GetMetadataOptions,
  SetMetadataOptions,
  SetMetadataResponse,
} from '@google-cloud/storage/build/src/nodejs-common/service-object';
import { ReadableStreamBuffer, WritableStreamBuffer } from 'stream-buffers';
import { IStorage } from './MockStorage';

export type Metadata = any;

export interface IMockableFile {
  delete(options?: DeleteOptions): Promise<[any]>;
  exists(options?: ExistsOptions): Promise<[boolean]>;
  download(options?: DownloadOptions): Promise<DownloadResponse>;
  getSignedUrl(cfg: GetSignedUrlConfig): Promise<GetSignedUrlResponse>;
  save(data: string | Buffer, options?: SaveOptions): Promise<void>;
  setMetadata(metadata: Metadata, options?: SetMetadataOptions): Promise<SetMetadataResponse>;
  getMetadata(options?: GetMetadataOptions): Promise<[Metadata, any]>;
}

export interface IFile extends IMockableFile {
  bucket: IBucket;
  storage: IStorage;
  metadata: Metadata;
  name: string;
  parent: IBucket;
  createWriteStream(options?: CreateWriteStreamOptions): Writable;
  createReadStream(options?: CreateReadStreamOptions): Readable;
}

type MockableFileMockError = { type: 'error'; error: Error };
type MockableFileQueues<T extends keyof IMockableFile = keyof IMockableFile> = {
  [K in T]: MockableFileMockError[];
};

export class MockFile implements IFile {
  private mockQueues: MockableFileQueues;

  public name: string;
  public bucket: MockBucket;
  public parent: MockBucket;
  public storage: IStorage;
  public metadata: Metadata;
  public contents: Buffer;

  public constructor(bucket: MockBucket, name: string, options?: FileOptions) {
    this.name = name;
    this.bucket = bucket;
    this.parent = bucket;
    this.storage = bucket.storage;
    this.contents = Buffer.alloc(0);
    this.metadata = { metadata: {} };
    this.mockQueues = {
      exists: [],
      delete: [],
      download: [],
      getSignedUrl: [],
      save: [],
      setMetadata: [],
      getMetadata: [],
    };
  }

  private mustBeExists() {
    const exists = !!this.bucket.files[this.name];
    if (!exists) throw new Error(`No such file: ${this.bucket.name}/${this.name}`);
  }

  private markAsExists() {
    const exists = !!this.bucket.files[this.name];
    if (!exists) this.bucket.files[this.name] = this;
  }

  /**
   * Resets the mock queues for the specified method, or for all methods if no method is specified.
   * @param method Optional. The method for which to reset the mock queue.
   * @returns The current `MockFile` instance.
   **/
  public mockReset<T extends keyof MockableFileQueues>(method?: T) {
    if (method) this.mockQueues[method] = [];
    else {
      this.mockQueues = {
        exists: [],
        delete: [],
        download: [],
        getSignedUrl: [],
        save: [],
        setMetadata: [],
        getMetadata: [],
      };
    }

    return this;
  }

  /**
   * Causes the next call to the given method to throw the specified error once, then return to normal behavior.
   * @param method - The name of the method to be mocked.
   * @param error - The error to be thrown on the next call to the method.
   * @returns The current `MockFile` instance.
   */
  public mockErrorOnce<T extends keyof MockableFileQueues>(method: T, error: Error) {
    if (!this.mockQueues[method])
      throw Error(
        `Method '${method}' is not mockable, use on of these: ${Object.keys(this.mockQueues).join(
          ', '
        )}`
      );

    this.mockQueues[method].push({ type: 'error', error });

    return this;
  }

  public async delete(): Promise<[any]> {
    const mockValue = this.mockQueues.delete.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.mustBeExists();

    delete this.bucket.files[this.name];

    return [{}];
  }

  public async exists(): Promise<[boolean]> {
    const mockValue = this.mockQueues.exists.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    return [!!this.bucket.files[this.name]];
  }

  public async setMetadata(metadata: Metadata): Promise<SetMetadataResponse> {
    const mockValue = this.mockQueues.setMetadata.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.mustBeExists();

    const customMetadata = { ...this.metadata.metadata, ...metadata.metadata };
    this.metadata = { ...this.metadata, ...metadata, metadata: customMetadata };

    return [this.metadata];
  }

  public async getMetadata(options?: GetMetadataOptions): Promise<[Metadata, any]> {
    const mockValue = this.mockQueues.getMetadata.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.mustBeExists();

    return [this.metadata, {}];
  }

  public async getSignedUrl(options?: GetSignedUrlConfig): Promise<GetSignedUrlResponse> {
    const mockValue = this.mockQueues.getSignedUrl.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.mustBeExists();

    return [
      `https://storage.googleapis.com/${this.bucket.name}/${this.name}?X-Goog-Algorithm=MOCKED`,
    ];
  }

  public createReadStream(): Readable {
    this.mustBeExists();

    const readable = new ReadableStreamBuffer();
    readable.put(this.contents);
    readable.stop();
    return readable as Readable;
  }

  public createWriteStream(options?: CreateWriteStreamOptions): Writable {
    this.markAsExists();

    const writable = new WritableStreamBuffer();
    writable.on('finish', () => {
      this.contents = writable.getContents() as Buffer;
    });
    return writable as Writable;
  }

  public async download(options?: DownloadOptions): Promise<DownloadResponse> {
    const mockValue = this.mockQueues.download.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.mustBeExists();

    if (options?.destination) {
      writeFileSync(options.destination, this.contents);
    }

    return [this.contents];
  }

  public async save(data: string | Buffer, options?: SaveOptions): Promise<void> {
    const mockValue = this.mockQueues.save.shift();
    if (mockValue && mockValue.type === 'error') throw mockValue.error;

    this.markAsExists();

    if (options?.metadata) this.metadata = options.metadata;
    this.contents = Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  /**
   * Copies the current file to the specified destination.
   * @param destination The destination can be a string (file name), Bucket, or File object.
   * @param options Optional CopyOptions.
   * @returns A promise that resolves to the CopyResponse.
   */
  public async copy(
    destination: string | MockBucket | MockFile,
    options?: CopyOptions
  ): Promise<CopyResponse> {
    let targetBucket: MockBucket;
    let targetFileName: string;

    if (typeof destination === 'string') {
      targetBucket = this.bucket;
      targetFileName = destination;
    } else if ('name' in destination && 'file' in destination) {
      // Check for the presence of the 'file' method as an indication of a Bucket.
      targetBucket = destination;
      targetFileName = this.name;
    } else if ('name' in destination) {
      // This checks for the File-like object.
      targetBucket = destination.bucket;
      targetFileName = destination.name;
    } else {
      throw new Error('Invalid destination type');
    }
    const [contents] = await this.download();
    const [metadata] = await this.getMetadata();

    // Merge options.metadata with existing metadata
    const newMetadata = { ...metadata, ...options?.metadata };

    // Create a new file in the target bucket and write contents and metadata
    const newFile = targetBucket.file(targetFileName);
    // await newFile.save(contents);
    // await newFile.setMetadata(newMetadata);
    await newFile.save(contents, { metadata: newMetadata });

    // Return CopyResponse format
    return [newFile as any, newMetadata];
  }
}

export default MockFile;
