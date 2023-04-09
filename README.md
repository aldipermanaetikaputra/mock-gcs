# mock-gcs

Mock implementation of the Google Cloud Storage SDK written in TypeScript. It is designed for testing and development purposes and allows you to test your code that interacts with Google Cloud Storage without making actual API calls or incurring charges.

The implementation provides mock objects for `Storage`, `Bucket`, and `File` classes in the [`@google-cloud/storage`](https://www.npmjs.com/package/@google-cloud/storage) package. While the implementation is incomplete, most basic features are supported.

Available:

- `storage.bucket()`
- `bucket.file()`
- `bucket.upload()`
- `bucket.getFiles()` (promise-based only)
- `file.delete()` (promise-based only)
- `file.exists()` (promise-based only)
- `file.download()` (promise-based only)
- `file.save()` (promise-based only)
- `file.getSignedUrl()` (promise-based only)
- `file.setMetadata()` (promise-based only)
- `file.getMetadata()` (promise-based only)
- `file.createWriteStream()`
- `file.createReadStream()`

If you need another method to be available, you can ask me by creating an issue or submitting your pull request.

## Install

```bash
# using npm
npm install mock-gcs
# using yarn
yarn add mock-gcs
```

## Usage

To use the mock storage in your tests, you can import the `MockStorage` class from the package.

```js
// in ESM
import { MockStorage } from 'mock-gcs';
// in CommonJS
const { MockStorage } = require('mock-gcs');
```

Then, create an instance of it:

```js
const storage = new MockStorage();
```

The `storage` object provides the same interface as the `Storage` class from the [`@google-cloud/storage`](https://www.npmjs.com/package/@google-cloud/storage) package, including the `bucket()` method to create a mock bucket object.

```js
const bucket = storage.bucket('my-bucket');
```

The `bucket` object provides the same interface as the `Bucket` class from the [`@google-cloud/storage`](https://www.npmjs.com/package/@google-cloud/storage) package, including the `file()` method to create a mock file object.

```js
const file = bucket.file('my-file.txt');
```

The `file` object provides the same interface as the `File` class from the [`@google-cloud/storage`](https://www.npmjs.com/package/@google-cloud/storage) package, including methods for uploading, downloading, and deleting files.

```js
await file.save('Hello, world!');

const [data] = await file.download();
console.log(data.toString()); // "Hello, world!"

const [exists] = await file.exists();
console.log(exists); // true

const [url] = await file.getSignedUrl();
console.log(url); // "https://storage.googleapis.com/my-bucket/my-file.txt?X-Goog-Algorithm=MOCKED"

await file.delete();
```

You also can simulate a custom error by using `mockErrorOnce()` method.

```js
// Simulate an error during saving
const error = new Error('Failed to save');
file.mockErrorOnce('save', error);

try {
  await file.save('Will not be saved!'); // An error thrown
} catch (error) {
  console.error(error.message); // Failed to save
}
console.log('exists:', await file.exists()); // exists: [false]

await file.save('Will definitely be saved!'); // No error thrown
console.log('exists:', await file.exists()); // exists: [true]
```

We also provide `IStorage`, `IBucket`, and `IFile` interfaces that define a set of methods and properties that can be implemented by both [`@google-cloud/storage`](https://www.npmjs.com/package/@google-cloud/storage) and `mock-gcs` with TypeScript.

```ts
import { IStorage, IBucket, IFile, MockStorage } from 'mock-gcs';
import { Storage } from '@google-cloud/storage';

class StorageConsumer {
  public bucket: IBucket;

  constructor(storage: IStorage) {
    this.bucket = storage.bucket('my-bucket');
  }

  public async isExists(path: string) {
    const file: IFile = this.bucket.file(path);
    const [exists] = await file.exists();
    return exists;
  }

  // any other methods here...
}

const mockConsumer = new StorageConsumer(new MockStorage()); // use mocked version
const realConsumer = new StorageConsumer(new Storage()); // use real GCS SDK
```

## API

Here are additional methods that only mock objects have:

### `bucket.put(name: string, contents?: string | Buffer, metadata?: Metadata): Promise<MockFile>`

It used to create or overwrite a file in the bucket with the given `name` and `contents`. If a `metadata` object is also provided, it will be set as the metadata for the file.

The method returns a promise that resolves to the `MockFile` object that was created or updated.

```js
const file = await bucket.put('file.txt', 'Hello, world!');
const [files] = await bucket.getFiles();

console.log(files.map(file => file.name)); // [ 'file.txt' ]
```

### `file.mockErrorOnce(method: string, error: Error): void`

It allows the user to simulate an error when invoking a specific method on the MockFile instance, and it will only throw an error once for that method.

For example, if you want to simulate an error when calling the `getMetadata()` method once, you can call `mockErrorOnce('getMetadata', new Error('some error message'))` on your `MockFile` instance. The next time you call `getMetadata()` on that instance, it will throw the provided error object.

The method is useful when you want to test how your code behaves when an error occurs during a particular operation. It allows you to simulate these errors in a controlled manner, without having to create complex test setups with external dependencies.

It's worth noting that `mockErrorOnce()` only affects the next call to the specified method. If you want to simulate an error for multiple calls, you will need to call `mockErrorOnce()` again for each call. Also, if you want to simulate errors for multiple methods, you will need to call `mockErrorOnce()` separately for each method.

Supported methods: `delete()`, `exists()`, `download()`, `save()`, `getSignedUrl()`, `setMetadata()`, `getMetadata()`.

### `file.mockReset(method?: string): void`

It used to resets the mock queues that allows you to reset the mock state of the instance. When called with no arguments, it resets all mock queues to empty arrays. However, if you pass in a specific method name as an argument, it will reset only that method's mock queue. This can be useful when used in conjunction with `mockErrorOnce()`, as it allows you to remove a previously set mock error for a specific method and restore its original behavior.

## Testing

This library is well tested. You can test the code as follows:

```bash
# using npm
npm test
# using yarn
yarn test
```

## Contribute

If you have anything to contribute, or functionality that you lack - you are more than welcome to participate in this!

## License

Feel free to use this library under the conditions of the MIT license.
