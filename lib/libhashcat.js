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
            concatenateFiles(block);
        });
    });




var concatenateFiles = function (block) {

// Concatenate the JS files
        new compress.minify({
            type: 'no-compress',
            fileIn: block.src,
            fileOut: block.dest,
            callback: function (err) {

                uglifyFile(block);
            }

        });
    }
};


var uglifyFile = function (block) {
    // Minify the JS file
    new compress.minify({
        type: 'uglifyjs',
        fileIn: block.dest,
        fileOut: block.dest,
        callback: function (err) {
            hashFileContents(block);
        }
    });

};



var hashFileContents = function (block) {

    fs.readFile(block.dest, 'utf8', function (err, data) {
        var hash = crypto.createHash('md5').update(data).digest("hex");
        renameFileFromHash(hash, block); // 9b74c9897bac770ffc029102a200c5de

    });
};


var renameFileFromHash = function(hash, block){

    var revPath = (path.join(path.dirname(block.dest), hash.substr(0,8) + '.' + path.basename(block.dest)));
    fs.rename(block.dest, revPath);
    replaceReferences(block, revPath);

};

var replaceReferences = function(block, rev){

    var newRevvedPath = block.relativeDest.replace(path.basename(block.relativeDest), path.basename(rev));
        var replacements = [{file:block.relativeDest,revved:newRevvedPath}];
        var contents = proc.process(replacements);

    fs.writeFile('/home/mendhak/Code/node-hashcat/example/tryMe.html', contents, function(err){
        if(err) {
            console.error("Error saving file %s", err);
            process.exit(1);
        }
        console.log('file saved!');
    });


};



exports.process = process;
