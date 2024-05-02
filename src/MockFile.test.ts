import MockFile from './MockFile';
import MockBucket from './MockBucket';
import MockStorage from './MockStorage';
import stream from 'stream';
import util from 'util';

describe('MockFile', () => {
  let bucket: MockBucket;
  let storage: MockStorage;
  let file: MockFile;

  beforeEach(() => {
    storage = new MockStorage();
    bucket = storage.bucket('test-bucket');
    file = bucket.file('test-file.txt', undefined, true);
  });

  describe('copy', () => {
    it('should copy the file within the same bucket', async () => {
      const contents = 'test file contents';
      const metadata = { foo: 'bar' };

      // Set file contents
      file.contents = Buffer.from(contents);
      // Set file metadata
      await file.setMetadata(metadata);

      // Copy the file
      await file.copy('copied-file.txt');
      const copiedFile = bucket.file('copied-file.txt');

      // Get response
      const response = await copiedFile.download();

      // Check contents is the same
      expect(response[0]).toEqual(Buffer.from(contents));
      // Check metadata is the same
      const [result] = await copiedFile.getMetadata();
      expect(result.foo).toBe('bar');
    });
  });

  describe('constructor', () => {
    it('should create a new instance with the correct properties', () => {
      expect(file.bucket).toBe(bucket);
      expect(file.parent).toBe(bucket);
      expect(file.storage).toBe(storage);
      expect(file.name).toBe('test-file.txt');
      expect(file.metadata).toEqual({ metadata: {} });
      expect(file.contents).toEqual(Buffer.alloc(0));
    });
  });

  describe('exists', () => {
    it('should resolve with true if the file exists', async () => {
      const [exists] = await file.exists();
      expect(exists).toBe(true);
    });

    it('should resolve with false if the file does not exist', async () => {
      const nonExistentFile = bucket.file('non-existent-file.txt');
      const [exists] = await nonExistentFile.exists();
      expect(exists).toBe(false);
    });

    it('should return true if the file exists', async () => {
      const newFile = bucket.file('new-file.txt');
      await newFile.save('contents');
      const [exists] = await newFile.exists();
      expect(exists).toBe(true);
    });

    it('should throw an error if the exists operation fails', async () => {
      const errorMessage = 'Exists error';
      file.mockErrorOnce('exists', new Error(errorMessage));
      await expect(file.exists()).rejects.toThrow(errorMessage);
    });
  });

  describe('delete', () => {
    it('should remove the file from the bucket', async () => {
      await file.delete();
      const [exists] = await file.exists();
      expect(exists).toBe(false);
    });

    it('should throw an error if the file does not exist', async () => {
      const nonExistentFile = bucket.file('non-existent-file.txt');
      await expect(nonExistentFile.delete()).rejects.toThrow('No such file');
    });

    it('should throw an error if the delete operation fails', async () => {
      const errorMessage = 'Delete error';
      file.mockErrorOnce('delete', new Error(errorMessage));
      await expect(file.delete()).rejects.toThrow(errorMessage);
    });
  });

  describe('download', () => {
    it('should resolve with the file contents as a buffer', async () => {
      const data = 'test file contents';
      file.contents = Buffer.from(data);
      const response = await file.download();
      expect(response[0]).toEqual(Buffer.from(data));
    });

    it('should throw an error if the file does not exist', async () => {
      const nonExistentFile = bucket.file('non-existent-file.txt');
      await expect(nonExistentFile.download()).rejects.toThrow();
    });
  });

  describe('getSignedUrl', () => {
    it('should return a signed URL', async () => {
      const [url] = await file.getSignedUrl({ action: 'read', expires: '03-17-2024' });
      expect(url).toBeDefined();
      expect(url.startsWith(`https://storage.googleapis.com/${bucket.name}/${file.name}`)).toBe(
        true
      );
    });

    it('should throw an error if the getSignedUrl operation fails', async () => {
      const errorMessage = 'Get signed URL error';
      file.mockErrorOnce('getSignedUrl', new Error(errorMessage));
      await expect(file.getSignedUrl({ action: 'read', expires: '03-17-2024' })).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('save', () => {
    it('should set the file contents', async () => {
      const data = 'test file contents';
      await file.save(Buffer.from(data));
      expect(file.contents).toEqual(Buffer.from(data));
    });

    it('should throw an error if saving fails', async () => {
      const contents = 'Hello, world!';
      const error = new Error('Failed to save');
      file.mockErrorOnce('save', error); // Simulate an error during save
      await expect(file.save(contents)).rejects.toThrow(error);
      expect(file.contents.toString()).not.toBe(contents); // Ensure contents were not saved
    });
  });

  describe('setMetadata', () => {
    it('should set the file metadata', async () => {
      const metadata = { foo: 'bar' };
      await file.setMetadata(metadata);
      expect(file.metadata.foo).toBe('bar');
    });
  });

  describe('getMetadata', () => {
    it('should return the file metadata', async () => {
      const metadata = { foo: 'bar' };
      await file.setMetadata(metadata);
      const [result] = await file.getMetadata();
      expect(result.foo).toBe('bar');
    });

    it('should throw an error if the file does not exist', async () => {
      const nonExistentFile = bucket.file('non-existent-file.txt');
      await expect(nonExistentFile.getMetadata()).rejects.toThrow();
    });
  });

  describe('createWriteStream', () => {
    it('should return a writable stream', async () => {
      const writeStream = file.createWriteStream();
      expect(writeStream).toBeDefined();
      expect(writeStream.writable).toBe(true);
      writeStream.write('Hello, world!');
      writeStream.end();
      await util.promisify(stream.finished)(writeStream);
      expect(file.contents.toString()).toBe('Hello, world!');
    });
  });

  describe('createReadStream', () => {
    it('should return a readable stream', async () => {
      const contents = 'Hello, world!';
      await file.save(contents);
      const readStream = file.createReadStream();
      expect(readStream).toBeDefined();
      expect(readStream.readable).toBe(true);
      let data = '';
      readStream.on('data', (chunk: Buffer) => (data += chunk.toString()));
      readStream.on('end', () => {
        expect(data).toBe(contents);
      });
    });
  });

  describe('cloudStorageURI', () => {
    it('should return a valid Cloud Storage URI', () => {
      const uri = file.cloudStorageURI;
      expect(uri.href).toBe('gs://test-bucket/test-file.txt');
    });
  });
});
