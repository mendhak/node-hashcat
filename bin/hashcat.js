#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');
hcat = require(lib + '/libhashcat.js');

var options = {
    html: 'tryMe.html',
    compress: true
}

hcat.process(options);


