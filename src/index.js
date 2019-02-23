import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import isImage from 'is-image';
import Listr from 'listr';
import { words, keys, has } from 'lodash';

const logExtract = debug('page-loader: extract ');
const logRequest = debug('page-loader: request ');
const logWrite = debug('page-loader: download ');

const handleError = (error) => {
  const errorTypes = [
    {
      type: 'File system',
      check: err => has(err, 'path'),
      data: err => err.path,
    },
    {
      type: 'Network',
      check: () => true,
      data: err => err.config.url,
    },
  ];

  const { type, data } = errorTypes.find(({ check }) => check(error));
  return `${type} error: trouble occured with ${data(error)} --> ${error.message}.`;
};

const exists = link => link !== undefined;

const isLocal = (link) => {
  const { host } = url.parse(link);
  return !host;
};

const contentTypes = {
  main: (address) => {
    const { host, pathname } = url.parse(address);
    return [`${host}${pathname}`, '.html'];
  },
  directory: (address) => {
    const [pathString] = contentTypes.main(address);
    return [pathString, '_files'];
  },
  resource: (address) => {
    const { dir, name, ext } = path.parse(address);
    return [path.join(dir, name), ext];
  },
};

const getContentName = (address, type) => {
  const [pathString, postfix] = contentTypes[type](address);
  return words(pathString, /[^./]+/g).join('-').concat(postfix);
};

const tagsProperties = {
  script: { attribute: 'src', responseType: () => 'text' },
  img: { attribute: 'src', responseType: () => 'arraybuffer' },
  link: { attribute: 'href', responseType: filepath => (isImage(filepath) ? 'arraybuffer' : 'text') },
};


export default (address, dirpath) => {
  const resourceDirectoryName = getContentName(address, 'directory');
  const mainFileName = getContentName(address, 'main');
  const mainFilePath = path.join(dirpath, mainFileName);

  const links = [];
  let modifiedMainFile = '';

  logRequest(address);
  return axios.get(address)
    .then((response) => {
      const $ = cheerio.load(response.data, { decodeEntities: false });

      const tags = keys(tagsProperties);
      tags.forEach((tag) => {
        const { attribute } = tagsProperties[tag];
        $(tag).each((i, element) => {
          const link = $(element).attr(attribute);
          if (exists(link) && isLocal(link)) {
            logExtract(link);
            links.push({ link, tag });
            const resourceName = getContentName(link, 'resource');
            const resourcePath = path.join(resourceDirectoryName, resourceName);
            $(element).attr(attribute, resourcePath);
          }
        });
      });

      modifiedMainFile = $.html();
      return fs.mkdir(path.join(dirpath, resourceDirectoryName));
    })
    .then(() => {
      const loadingResourcesPromises = links.map(({ link, tag }) => {
        const resourceName = getContentName(link, 'resource');
        const resourcePath = path.join(dirpath, resourceDirectoryName, resourceName);
        const { responseType } = tagsProperties[tag];

        const resourceTask = new Listr([
          {
            title: url.resolve(address, link),
            task: () => axios({
              method: 'get',
              responseType: responseType(link),
              url: url.resolve(address, link),
            }).then((resourceResponse) => {
              logWrite(`resource ${link} to ${resourcePath}`);
              return fs.writeFile(resourcePath, resourceResponse.data);
            }).catch(handleError),
          },
        ], { exitOnError: false });

        logRequest(link);
        return resourceTask.run();
      });

      return Promise.all(loadingResourcesPromises);
    })
    .then(() => {
      logWrite(`resource ${address} to ${mainFilePath}`);
      return fs.writeFile(mainFilePath, modifiedMainFile);
    })
    .then(() => mainFileName)
    .catch((error) => {
      const message = handleError(error);
      throw new Error(message);
    });
};
