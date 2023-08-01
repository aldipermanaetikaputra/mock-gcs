import MockBucket from './MockBucket';
import MockStorage from './MockStorage';
import tmp from 'tmp';
import fs from 'fs';

tmp.setGracefulCleanup();

describe('MockBucket', () => {
  let storage: MockStorage;
  let bucket: MockBucket;

  beforeEach(() => {
    storage = new MockStorage();
    bucket = storage.bucket('test-bucket');
  });

  describe('file', () => {
    it('should create a new file if it does not exist', () => {
      const file = bucket.file('my-file.txt');
      expect(file).toBeDefined();
    });

    it('should return an existing file if it exists', () => {
      const file1 = bucket.file('my-file.txt');
      const file2 = bucket.file('my-file.txt');
      expect(file1).toEqual(file2);
    });
  });

  describe('put', () => {
    it('should create a new file with the specified name and contents', async () => {
      const file = await bucket.put('file.txt', 'Hello, world!');

      expect(file.name).toBe('file.txt');
      expect(file.contents.toString()).toBe('Hello, world!');
    });

    it('should create a new file with the specified name and metadata', async () => {
      const metadata = { contentType: 'text/plain' };
      const file = await bucket.put('file.txt', '', metadata);

      expect(file.name).toBe('file.txt');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(file.metadata.contentType).toBe('text/plain');
    });

    it('should update an existing file with the specified name and contents', async () => {
      await bucket.put('file.txt', 'Old contents');
      const file = await bucket.put('file.txt', 'New contents');

      expect(file.contents.toString()).toBe('New contents');
    });

    it('should update an existing file with the specified name and metadata', async () => {
      await bucket.put('file.txt', '', { contentType: 'image/png' });
      const metadata = { contentType: 'image/jpeg' };
      const file = await bucket.put('file.txt', '', metadata);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(file.metadata.contentType).toBe('image/jpeg');
    });
  });

  describe('upload', () => {
    it('should upload a file to the bucket', async () => {
      const fileName = 'test.txt';
      const filePath = tmp.fileSync({ postfix: fileName }).name;
      const fileContents = 'hello world';

      fs.writeFileSync(filePath, fileContents);

      const [file, metadata] = await bucket.upload(filePath, {
        destination: 'uploaded.txt',
        metadata: { key: 'value' },
      });

      expect(file.name).toBe('uploaded.txt');
      expect(metadata).toEqual({ metadata: {}, key: 'value' });

      const uploadedFile = bucket.file('uploaded.txt');
      const contents = await uploadedFile.download();

      expect(contents.toString()).toBe(fileContents);
    });
  });

  describe('getFiles', () => {
    it('should get a list of files', async () => {
      const [file1, metadata1] = await bucket.upload(tmp.fileSync().name);
      const [file2, metadata2] = await bucket.upload(tmp.fileSync().name);
      const [files, _, __] = await bucket.getFiles();

      expect(files.length).toBe(2);
      expect(files[0].name).toBe(file1.name);
      expect(files[1].name).toBe(file2.name);
      expect(metadata1).toEqual({ metadata: {} });
      expect(metadata2).toEqual({ metadata: {} });
    });

    it('should get a list of files with filter params', async () => {
      const file1 = await bucket.put('test-1.txt');
      const file2 = await bucket.put('test-2.txt');
      const file3 = await bucket.put('nn-test-3.txt');

      const [files, _, __] = await bucket.getFiles({ prefix: 'test-' });

      expect(files.length).toBe(2);
      expect(files[0].name).toBe(file1.name);
      expect(files[1].name).toBe(file2.name);
    });
  });

  describe('deleteFiles', () => {
    it('should delete files with prefix params', async () => {
      const file1 = await bucket.put('test-1.txt');
      const file2 = await bucket.put('test-2.txt');
      const file3 = await bucket.put('nn-test-3.txt');

      await bucket.deleteFiles({ prefix: 'test-' });
      const [exists1] = await file1.exists();
      const [exists2] = await file2.exists();
      const [exists3] = await file3.exists();

      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
      expect(exists3).toBe(true);
    });

    it('should delete all files without prefix set', async () => {
      const file1 = await bucket.put('test-1.txt');
      const file2 = await bucket.put('test-2.txt');
      const file3 = await bucket.put('nn-test-3.txt');

      await bucket.deleteFiles({});
      const [exists1] = await file1.exists();
      const [exists2] = await file2.exists();
      const [exists3] = await file3.exists();

      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
      expect(exists3).toBe(false);
    });
  });

  describe('cloudStorageURI', () => {
    it('should return a valid Cloud Storage URI', () => {
      const uri = bucket.cloudStorageURI;
      expect(uri.href).toBe('gs://test-bucket');
    });
  });
});
