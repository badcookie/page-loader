import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';
import { words } from 'lodash';

const getFilename = (address) => {
  const { host, pathname } = url.parse(address);
  return words(`${host}${pathname}`, /[^./]+/g)
    .join('-').concat('.html');
};

export default (address, dirpath) => {
  const filename = getFilename(address);
  const filepath = path.join(dirpath, filename);
  return axios.get(address)
    .then(response => fs.writeFile(filepath, response.data))
    .catch((e) => {
      throw e;
    });
};
