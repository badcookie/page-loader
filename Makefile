install:
	npm install

run:
	npx babel-node -- src/bin/page-loader.js

publish:
	rm -rf dist
	npm publish

lint:
	npx eslint .

test:
	npm test

coverage:
	npm test -- --coverage
