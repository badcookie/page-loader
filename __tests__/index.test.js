import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const getFixtureFilepath = (filename) => {
  const fixturesPath = path.join(__dirname, '__fixtures__');
  return path.join(fixturesPath, filename);
};

const baseUrl = 'https://hexlet.io/';

const mainFileName = 'hexlet-io-courses.html';
const resourceDirectoryName = 'hexlet-io-courses_files';
const resourceLink1 = '/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js';
const resourceLink2 = '/courses';


beforeEach(async () => {
  const originalMainFile = await fs.readFile(getFixtureFilepath(mainFileName), 'utf-8');

  nock(baseUrl)
    .get('/courses')
    .reply(200, originalMainFile);
});

test('should download resources to appropriate directories', async () => {
  expect.assertions(2);

  const resourceData1 = await fs.readFile(getFixtureFilepath('resource1.txt'), 'utf-8');
  const resourceData2 = await fs.readFile(getFixtureFilepath('resource2.txt'), 'utf-8');

  nock(baseUrl)
    .get(resourceLink1)
    .reply(200, resourceData1);

  nock(baseUrl)
    .get(resourceLink2)
    .reply(200, resourceData2);

  const expectedMainFile = await fs.readFile(getFixtureFilepath('modified-hexlet-io-courses.html'), 'utf-8');

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
  const resourceDirectoryPath = path.join(temporaryDirectory, resourceDirectoryName);

  await pageLoader('https://hexlet.io/courses', temporaryDirectory);
  const actualMainFile = await fs.readFile(path.join(temporaryDirectory, mainFileName), 'utf-8');

  expect(actualMainFile).toEqual(expectedMainFile);
  expect(() => fs.access(resourceDirectoryPath)).not.toThrowError();
});

test('should consider error cases', async () => {
  expect.assertions(2);

  const fakeUrl = 'https://hexlet.oi/courses';
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
  const fakeUrlHandler = () => pageLoader(fakeUrl, temporaryDirectory);

  const fakeDirectory = path.join(__dirname, 'fake');
  const fakeDirectoryHandler = () => pageLoader('https://hexlet.io/courses', fakeDirectory);

  expect(fakeDirectoryHandler()).toThrowErrorMatchingSnapshot();
  expect(fakeUrlHandler()).toThrowErrorMatchingSnapshot();
});
