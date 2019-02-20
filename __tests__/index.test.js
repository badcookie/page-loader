import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const filename = 'hexlet-io-courses.html';
const expectedContentFilepath = path.join(__dirname, '__fixtures__', filename);

test('should download resource to appropriate directory', async () => {
  const expectedBody = await fs.readFile(expectedContentFilepath, 'utf-8');

  nock('https://hexlet.io/')
    .get('/courses')
    .reply(200, expectedBody);

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
  await pageLoader('https://hexlet.io/courses', temporaryDirectory);
  const actualBody = await fs.readFile(path.join(temporaryDirectory, filename), 'utf-8');
  expect(actualBody).toEqual(expectedBody);
});
