var fs = require('fs');
var path = require('path');
var compress = require('node-minify');
var crypto = require('crypto');
var HTMLProcessor = require('../lib/htmlprocessor');


var proc;

var process = function (options) {
    begin();

}



var begin = function () {

    var fileBody = "";

    fs.readFile('/home/mendhak/Code/node-hashcat/example/tryMe.html', 'utf8', function (err, data) {

        fileBody = data;

        proc = new HTMLProcessor(path.dirname('/home/mendhak/Code/node-hashcat/example/tryMe.html'), null, fileBody, null, function (msg) {
            console.log(msg);
        });



        proc.blocks.forEach(function (block) {

            console.log(block);
            concatenateFiles(block.src, block.dest)
        });
    });




var concatenateFiles = function (files, dest) {

// Concatenate the JS files
        new compress.minify({
            type: 'no-compress',
            fileIn: files,
            fileOut: dest,
            callback: function (err) {

                uglifyFile(dest);
            }

        });
    }
};


var uglifyFile = function (file) {
    // Minify the JS file
    new compress.minify({
        type: 'uglifyjs',
        fileIn: file,
        fileOut: file,
        callback: function (err) {
            hashFileContents(file);
        }
    });

};



var hashFileContents = function (file) {

    fs.readFile(file, 'utf8', function (err, data) {
        var hash = crypto.createHash('md5').update(data).digest("hex");
        renameFileFromHash(hash, file); // 9b74c9897bac770ffc029102a200c5de

    });
};


var renameFileFromHash = function(hash, file){

    var revPath = (path.join(path.dirname(file), hash.substr(0,8) + '.' + path.basename(file)));
    fs.rename(file, revPath);
    replaceReferences(file, revPath);

};

var replaceReferences = function(file, rev){
    console.log(file);
    console.log(rev);
        var replacements = [{file:'app.js',revved:'1a222.app.js'}];
        var contents = proc.process(replacements);
};



exports.process = process;
