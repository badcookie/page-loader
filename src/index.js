import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import { words, keys } from 'lodash';

const logExtract = debug('page-loader: extract ');
const logRequest = debug('page-loader: request ');
const logWrite = debug('page-loader: download ');

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
  script: { attribute: 'src', responseType: 'text' },
  img: { attribute: 'src', responseType: 'stream' },
  link: { attribute: 'href', responseType: 'text' },
};

export default (address, dirpath) => {
  const resourceDirectoryName = getContentName(address, 'directory');
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
        logRequest(link);
        const { host } = url.parse(address);
        const { responseType } = tagsProperties[tag];
        return axios({
          method: 'get',
          responseType,
          url: `https://${host}${link}`,
        }).then((resourceResponse) => {
          logWrite(`resource ${link} to ${resourcePath}`);
          return fs.writeFile(resourcePath, resourceResponse.data);
        });
      });

      return Promise.all(loadingResourcesPromises);
    })
    .then(() => {
      const mainFileName = getContentName(address, 'main');
      const mainFilePath = path.join(dirpath, mainFileName);
      logWrite(`resource ${address} to ${mainFilePath}`);
      return fs.writeFile(mainFilePath, modifiedMainFile);
    });
};
