#!/usr/bin/env node
import program from 'commander';
import downloadPage from '..';
import { version } from '../../package.json';

program
  .description('Takes an URL and loads its content.')
  .version(version);

program
  .option('-o, --output [path]', 'output format', './');

program
  .arguments('<url>')
  .action((url) => {
    console.log('');
    downloadPage(url, program.output)
      .then(mainFileName => console.log(`\nPage was downloaded as '${mainFileName}'`))
      .catch(error => console.error(error.message))
      .then(() => console.log(''));
  });

program.parse(process.argv);
