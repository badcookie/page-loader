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
  .action(async (url) => {
    try {
      console.log('');
      const mainFileName = await downloadPage(url, program.output);
      console.log(`\nPage was downloaded as '${mainFileName}'`);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
