import { File, FileOptions, GetFilesOptions, UploadOptions } from '@google-cloud/storage';
import { IFile, Metadata, MockFile } from './MockFile';
import { IStorage } from './MockStorage';
import fs from 'fs';
import path from 'path';

export interface IBucket {
  name: string;
  storage: IStorage;
  upload(pathString: string, options?: UploadOptions): Promise<[IFile, Metadata]>;
  file(name: string, options?: FileOptions): IFile;
  getFiles(query?: GetFilesOptions): Promise<[IFile[], any, any]>;
}

export default class MockBucket implements IBucket {
  public name: string;
  public storage: IStorage;
  public files: Record<string, MockFile>;

  public constructor(storage: IStorage, name: string) {
    this.name = name;
    this.storage = storage;
    this.files = {};
  }

  /**
   * Creates or updates a file in the bucket with the given name,
   * contents, and metadata.
   * @param name - The name of the file.
   * @param contents - The contents of the file, as a string or a Buffer.
   * @param metadata - The metadata to set on the file.
   * @returns The created or updated file.
   */
  public async put(name: string, contents?: string | Buffer, metadata?: Metadata) {
    this.files[name] = new MockFile(this, name);

    if (contents) await this.files[name].save(contents);
    if (metadata) await this.files[name].setMetadata(metadata);

    return this.files[name];
  }

  public async upload(filePath: string, options?: UploadOptions): Promise<[IFile, Metadata]> {
    if (options?.destination instanceof File)
      throw new Error(
        'Type File for `options.destination` params is not supported, use string instead'
      );

    const name = options?.destination || path.basename(filePath);
    const contents = fs.readFileSync(filePath);
    const metadata = options?.metadata;
    const file = await this.put(name, contents, metadata);

    return [file, file.metadata];
  }

  public file(name: string, options?: FileOptions, forceExists = false): MockFile {
    const file = this.files[name] || new MockFile(this, name);

    if (forceExists) this.files[name] = file;

    return file;
  }

  public getFiles(query?: GetFilesOptions): Promise<[IFile[], any, any]> {
    const prefix = query?.prefix || '';
    const filtered = Object.entries(this.files)
      .filter(([name]) => name.startsWith(prefix))
      .map(([, file]) => file);

    return Promise.resolve([filtered, {}, {}]);
  }
}
