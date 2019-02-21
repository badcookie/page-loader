import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import { words } from 'lodash';

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
    const { host, pathname } = url.parse(address);
    return [`${host}${pathname}`, '_files'];
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

const tagsProperties = [
  {
    tag: 'script',
    attribute: 'src',
    responseType: 'text',
  },
  {
    tag: 'img',
    attribute: 'src',
    responseType: 'stream',
  },
  {
    tag: 'link',
    attribute: 'href',
    responseType: 'text',
  },
];

const getTagProperties = usersTag => tagsProperties.find(({ tag }) => tag === usersTag);

export default (address, dirpath) => {
  const resourceDirectoryName = getContentName(address, 'directory');
  const links = [];
  let modifiedMainFile = '';

  return axios.get(address)
    .then((response) => {
      const $ = cheerio.load(response.data, { decodeEntities: false });

      tagsProperties.forEach(({ tag, attribute }) => {
        $(tag).each((i, element) => {
          const link = $(element).attr(attribute);
          if (exists(link) && isLocal(link)) {
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

        const { host } = url.parse(address);
        const { responseType } = getTagProperties(tag);
        return axios({
          method: 'get',
          responseType,
          url: `https://${host}${link}`,
        }).then(resourceResponse => fs.writeFile(resourcePath, resourceResponse.data));
      });

      return Promise.all(loadingResourcesPromises);
    })
    .then(() => {
      const mainFileName = getContentName(address, 'main');
      const mainFilePath = path.join(dirpath, mainFileName);
      return fs.writeFile(mainFilePath, modifiedMainFile);
    });
};
