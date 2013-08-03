var fs = require('fs');
var path = require('path');
var compress = require('node-minify');
var crypto = require('crypto');
var HTMLProcessor = require('../lib/htmlprocessor');
var lockFile = require('lockfile')


var proc;

var process = function (options) {
    begin();
}


var begin = function () {

    var fileBody = "";

    fs.readFile('/home/mendhak/Code/node-hashcat/example/tryMe.html', 'utf8', function (err, data) {

        fileBody = data;

        proc = new HTMLProcessor(path.dirname('/home/mendhak/Code/node-hashcat/example/tryMe.html'), null, fileBody);


        proc.blocks.forEach(function (block) {
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


var renameFileFromHash = function (hash, block) {

    var revPath = (path.join(path.dirname(block.dest), hash.substr(0, 8) + '.' + path.basename(block.dest)));
    fs.rename(block.dest, revPath);
    replaceReferences(block, revPath);

};

var replaceReferences = function (block, rev) {

    var blockLine = block.raw.join(proc.linefeed);
    var replacement = blockLine.replace(blockLine, proc.replaceWith(block));
    replacement = replacement.replace(path.basename(block.relativeDest), path.basename(rev));


    lockFile.lock('lockfile.lock', {}, function (er) {

        fs.readFile('/home/mendhak/Code/node-hashcat/example/tryMe.html', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(blockLine, replacement);

            fs.writeFile('/home/mendhak/Code/node-hashcat/example/tryMe.html', result, 'utf8', function (err) {
                if (err) return console.log(err);
            });
        });

        // then, some time later, do:
        lockFile.unlock('lockfile.lock', function (er) {
            // er means that an error happened, and is probably bad.
        })
    });

};


exports.process = process;
