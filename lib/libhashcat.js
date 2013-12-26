var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var exec = require('child_process').exec
var crypto = require('crypto');
var HTMLProcessor = require('../lib/htmlprocessor');
var lockFile = require('lockfile');


var proc;
var options;

var hashcatify = function (settings) {

    options = settings;
    options.htmlFile = path.join(process.cwd(),settings.htmlFile);
    console.log(options);
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
            console.log("Processing block for " + block.dest);
            concatenateFiles(block);
        });
    });
};

var concatenateFiles = function (block) {

    var platform = require('os').platform();
    var prefix = (platform === 'win32') ? 'node ' : '';

    if(block.type=='css')
    {
        var concatenatedCss = '';
        //Concatenate CSS file contents
        block.src.forEach(function (css){
            var fs  = require("fs");
            concatenatedCss += fs.readFileSync(css).toString();
        });

        console.log("Cleaning CSS");
        var cleanCSS = require('clean-css');

        //Minify using clean-css
        var minimized = cleanCSS.process(concatenatedCss);
        fs.writeFile(block.dest, minimized, function (err) {
            if(!err)
            {
                hashFileContents(block);
            }
        });
    }
    else
    {
        // Concatenate and minify the JS files
        var command = prefix + '"' + __dirname + '/../node_modules/uglify-js/bin/uglifyjs" ' + block.src.join(' ') + ' -m --comments -o ' + block.dest;

        console.log("Uglifying JS");
        exec(command, {}, function (err, stdout, stderr) {
            if(!err)
            {
                hashFileContents(block);
            }
        });
    }
};


var hashFileContents = function (block) {
    fs.readFile(block.dest, 'utf8', function (err, data) {

        if(err){
            console.log('Error while reading file contents for hashing: ');
            console.log(err);
            return;
        }

        console.log("Getting hash of file");
        var hash = crypto.createHash('md5').update(data).digest("hex");
        renameFileFromHash(hash, block); 
    });
};


var renameFileFromHash = function (hash, block) {
    var revPath = (path.join(path.dirname(block.dest), hash.substr(0, 8) + '.' + path.basename(block.dest)));

    console.log("Creating copy with hashed filename");
    fse.copy(block.dest, revPath, function (err) {

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

    lockFile.lock('lockfile.lock', {wait:1500,retries:10,retryWait:300}, function (lockerror) {

        if(lockerror){
            console.log('Error while attempting to lock the file: ');
            console.log(lockerror);
            return;
        }

        fs.readFile(options.htmlFile, 'utf8', function (err, data) {
            if (err) {
                console.log('Error while attempting to read the file contents for replacing: ');
                console.log(err);
                return;
            }
            var result = data.replace(blockLine, replacement);

            console.log("Writing to HTML source file")
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
