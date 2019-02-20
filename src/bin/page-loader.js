#!/usr/bin/env node
import program from 'commander';
import pageLoader from '..';
import { version } from '../../package.json';

program
  .description('Takes an URL and loads its content.')
  .version(version);

program
  .option('-o, --output [path]', 'output format', './');

program
  .arguments('<url>')
  .action(url => pageLoader(url, program.output));

program.parse(process.argv);
