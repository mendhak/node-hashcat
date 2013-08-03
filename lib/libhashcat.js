var fs = require('fs');
var path = require('path');
var compress = require('node-minify');
var crypto = require('crypto');
var HTMLProcessor = require('../lib/htmlprocessor');
var lockFile = require('lockfile');


var proc;
var options;

var hashcatify = function (settings) {

    options = settings;
    options.htmlFile = path.join(process.cwd(),settings.htmlFile);
    begin();
};


var begin = function () {

    fs.readFile(options.htmlFile, 'utf8', function (err, data) {

        if(err){
            console.log('Error while reading the file contents: ');
            console.log(err);
            return;
        }

        proc = new HTMLProcessor(path.dirname(options.htmlFile), null, data);

        proc.blocks.forEach(function (block) {
            concatenateFiles(block);
        });
    });
};

var concatenateFiles = function (block) {

    // Concatenate the JS files
    new compress.minify({
        type: 'no-compress',
        fileIn: block.src,
        fileOut: block.dest,
        callback: function (err) {

            if(err){
                console.log('Error while concatenating the files: ');
                console.log(err);
                return;
            }

            uglifyFile(block);
        }
    });
};


var uglifyFile = function (block) {
    // Minify the JS file
    new compress.minify({
        type: 'uglifyjs',
        fileIn: block.dest,
        fileOut: block.dest,
        callback: function (err) {
            if(err){
                console.log('Error while minifying the file: ');
                console.log(err);
                return;
            }

            hashFileContents(block);
        }
    });
};


var hashFileContents = function (block) {
    fs.readFile(block.dest, 'utf8', function (err, data) {

        if(err){
            console.log('Error while reading file contents for hashing: ');
            console.log(err);
            return;
        }

        var hash = crypto.createHash('md5').update(data).digest("hex");
        renameFileFromHash(hash, block); 
    });
};


var renameFileFromHash = function (hash, block) {
    var revPath = (path.join(path.dirname(block.dest), hash.substr(0, 8) + '.' + path.basename(block.dest)));
    fs.rename(block.dest, revPath, function (err) {

        if(err){
            console.log('Error while renaming the file: ');
            console.log(err);
            return;
        }

        replaceReferences(block, revPath);
    });
};

var replaceReferences = function (block, rev) {

    var blockLine = block.raw.join(proc.linefeed);
    var replacement = blockLine.replace(blockLine, proc.replaceWith(block));
    replacement = replacement.replace(path.basename(block.relativeDest), path.basename(rev));
    console.log('Setting reference: ' + replacement);

    lockFile.lock('lockfile.lock', {}, function (lockerror) {

        if(lockerror){
            console.log('Error while attempting to lock the file: ');
            console.log(err);
            return;
        }

        fs.readFile(options.htmlFile, 'utf8', function (err, data) {
            if (err) {
                console.log('Error while attempting to read the file contents for replacing: ');
                console.log(err);
                return;
            }
            var result = data.replace(blockLine, replacement);

            fs.writeFile(options.htmlFile, result, 'utf8', function (err) {
                if (err) {
                    console.log('Error while attempting to write replacements to the HTML file: ');
                    console.log(err);
                    return;
                }
            });
        });

        // then, some time later, do:
        lockFile.unlock('lockfile.lock', function (err) {
            if (err) {
                console.log("Error while attempting to unlock the file:");
                console.log(err);
            }

        })
    });
};


exports.hashcatify = hashcatify;
