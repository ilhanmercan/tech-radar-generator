[![Build Status](https://travis-ci.org/dprgarner/tech-radar-generator.svg?branch=master)](https://travis-ci.org/dprgarner/tech-radar-generator)
[![npm](https://img.shields.io/npm/v/tech-radar-generator)](http://npmjs.com/package/tech-radar-generator)

# Tech Radar Generator

A library for creating a [ThoughtWorks Tech Radar][radar] as a static site. This project was forked from the [ThoughtWorks Build-Your-Own-Radar][byor] app, but modified for distribution as a reusable package.

[radar]: https://www.thoughtworks.com/radar
[byor]: https://github.com/thoughtworks/build-your-own-radar


## TL;DR

Fastest way to create a new version of Tech-radar is to use tech-radar-generator command. After updating your tech-radar json file on `tech-radar` folder, you can run below command.

```bash
> bin/tech-radar-generator tech-radar/v0_1.json ./dist
```

This will create all static files that you need to host on `dist` folder.

## Overview

A tech radar is an app for visualising trends within an area of software development. They reflect the opinions and decisions of the creators and curators of the radar, and by their nature are highly subjective. They are generally used to reflect the technology decisions and future technical directions within a company, team, or project. A more in-depth discussion of why you might want to build a Tech Radar, and the design decisions for the original ThoughtWorks tech radar, are given [here][byor-why].

[byor-why]: https://www.thoughtworks.com/insights/blog/build-your-own-technology-radar

This library is a tool for generating your own custom tech radar. The library provides a CLI script and a Node API which takes in as input a JSON file containing the data behind your radar, and outputs a directory with HTML, JS, and other static assets required to view the radar. The generated assets can then be served as a static site.

## Creating a radar with JSON

First, create a JSON file containing the data behind your tech radar. This data is validated against a [JSON schema][schema] before being processed, and the blips array uses the same API as the original tech radar.

[schema]: https://github.com/dprgarner/tech-radar-generator/blob/master/schema.json

The top-level JSON must contain the following properties:
- `title` - `string` - The title of the radar, which appears in the page title and the header of the page
- `quadrants` - `string[]` - An array of exactly four quadrant names in the radar, rendered anti-clockwise from the top-right
- `rings` - `string[]` - An array of up to four rings in the radar, from inner-most to outer-most
- `blips` - `blip[]` - An array of _blip_ objects determining the items appearing on the radar

Each blip object must contain the following properties:
- `name` - `string` - The name of the blip
- `quadrant` - `string` - The quadrant of the radar that the blip appears in. There should be exactly four different quadrants in the full list of blips.
- `ring` - `string` - The ring of the radar that the blip should appear in. This must take one of the provided ring values.
- `isNew` - `boolean` - Set to true if the blip has been created or modified recently
- `description` - `string` - A short description of the blip which appears when the blip is selected in the radar. This field can include HTML, and should include links to any supporting information or resources about the blip, and an explanation of why it's classified in the current ring.

For example:

```json
{
  "title": "My Radar",
  "quadrants": ["Quad1", "Quad2", "Quad3", "Quad4"],
  "rings": ["adopt", "trial", "assess", "hold"],
  "blips": [
    {
      "name": "JavaScript",
      "quadrant": "Quad1",
      "ring": "adopt",
      "isNew": false,
      "description": "<p>This is a description</p><p>Formatted into paragraphs</p>"
    },
    {
      "name": "Go",
      "quadrant": "Quad2",
      "ring": "trial",
      "isNew": true,
      "description": "This is a simple description"
    },
    {
      "name": "Java",
      "quadrant": "Quad3",
      "ring": "assess",
      "isNew": false,
      "description": "This is a <a href=\"/\">description</a><br /><br />Spanning several lines."
    },
    {
      "name": "C++",
      "quadrant": "Quad4",
      "ring": "hold",
      "isNew": false,
      "description": "This is another simple description"
    }
  ]
}
```

## Usage with the CLI

To use this JSON data with the CLI, install the library and run it against the JSON file. If this tool is being incorporated into an existing JavaScript project:
```bash
> yarn add tech-radar-generator
> yarn tech-radar-generator ./my-radar.json ./dist
```

If this tool is not being incorporated into a JavaScript project, the package can be run using npx:
```bash
> npx tech-radar-generator ./my-radar.json ./dist
```

The options for the CLI tool can be seen by running `npx tech-radar-generator --help`:

```bash
> npx tech-radar-generator --help
tech-radar-generator <input> <output>

Builds a tech radar

Positionals:
  input   the path to a valid JSON config input                         [string]
  output  the path to output the generated dist                         [string]

Options:
  --version  Show version number                                       [boolean]
  --dev, -d  build in development mode                                 [boolean]
  --help     Show help                                                 [boolean]
```

## Usage within Node

This library also exports a function version of the CLI, which takes the data, destination, and options as arguments and returns a promise resolving to the output directory.

```js
const techRadarGenerator = require('tech-radar-generator')
const data = require('./my-radar.json')

techRadarGenerator(data, './dist', { mode: 'development' })
  .then(dist => {
    console.log(`Successfully compiled to ${dist}`)
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

Unlike the CLI, this function takes the source data as a JavaScript object, and _not_ as a file path. The input and output arguments are required. The third argument is an optional "options" object, and takes the following properties:

- `mode`: `'development'` or `'production'` - The Webpack development mode. When set to `"production"`, the code is minified, but takes longer to process. Defaults to `"production"`.

## Usage with Docker

An example Dockerfile with an nginx config:


```dockerfile
# Dockerfile

FROM node:12 as build
WORKDIR /build
RUN yarn global add tech-radar-generator@0.4
COPY example-data.json /build/
RUN tech-radar-generator example-data.json /build/dist

FROM nginx:1.17.3
WORKDIR /opt/radar
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist .
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf

# server block for static file serving
server {
  listen 8080;
  location / {
    root /opt/radar;
    index index.html;
  }

  # custom error page for 404 errors
  error_page 404 /error.html;
  location = /error.html {
    root /opt/radar;
  }

  # nginx default error page for 50x errors
  error_page 500 502 503 504 /50x.html;
  location = /50x.html {
    root /usr/share/nginx/html;
  }
}
```

To build and run the image:

```bash
> docker build --tag my-tech-radar:0.4 .
> docker run -p8080:8080 my-tech-radar:0.4
```

## Developing

This tool is powered by Webpack. Some commonly-used scripts are set in the npm-scripts.

To run the webpack-dev-server:

    yarn dev

To run the tests:

    yarn test

To run the linter:

    yarn lint

To format the code using [standard][standard]:

    yarn format

[standard]: https://standardjs.com/

## Releasing

Releases to NPM are performed via Travis when tagged commits are pushed to the repo. Create a new tagged commit and bump the version in package.json with the npm version script:

```bash
npm version patch
```

and push the new commits and tags with:

```bash
git push && git push --tags
```

## Acknowledgements

This library is based off of the [ThoughtWorks Build-Your-Own-Radar](https://github.com/thoughtworks/build-your-own-radar) project.
