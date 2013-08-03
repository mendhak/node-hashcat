#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');
hcat = require(lib + '/libhashcat.js');

var options = {
    htmlFile: 'example/tryMe.html',
    compress: true
}

hcat.hashcatify(options);


