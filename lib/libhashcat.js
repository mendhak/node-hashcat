var fs = require("fs");
var path = require("path");
var stream = require("stream");
var crypto = require("crypto");
var HTMLProcessor = require("../lib/htmlprocessor");
var lockFile = require("lockfile");
var cleanCSS = require("clean-css");

var proc;
var options;

function combineCss(sources) {
    console.log("Concatenating CSS");

    var concatenatedCss = "";

    concatenatedCss = sources
        .map(function (source) {
            return fs.readFileSync(source).toString();
        })
        .reduce(function (concatenated, content) {
            return concatenated + content;
        }, "");

    console.log("Minifying CSS");

    return cleanCSS.process(concatenatedCss);
}

function combineJs(sources) {
    console.log("Minifying JS");
    var uglify = require("uglify-js");
    var uglified = uglify.minify(sources, {compress:false});
    return uglified.code;
}

function hashFilename(filename, content) {
    console.log("Getting hash of file");
    var hash = crypto.createHash("md5").update(content).digest("hex");
    return path.join(path.dirname(filename), hash.substr(0, 8) + "." + path.basename(filename));
}

var hashcatify = function (settings) {

    options = settings;
    options.htmlFile = path.join(process.cwd(),settings.htmlFile);
    options.outputHtmlFile = path.join(process.cwd(),settings.outputHtmlFile);
    console.log(options);
    begin();
};


var begin = function () {

    fs.readFile(options.htmlFile, "utf8", function (err, sourceHtml) {

        if(err){
            console.log("Error while reading the file contents: ");
            console.log(err);
            return;
        }

        proc = new HTMLProcessor(path.dirname(options.htmlFile), null, sourceHtml);
        proc.blocks.forEach(function (block) {
            console.log("-----");
            console.log("Processing block for " + block.dest);
            var fileContents;

            try {
                fileContents = (block.type === "css")
                    ? combineCss(block.src)
                    : combineJs(block.src);
            }
            catch (error) {
                console.log("ERROR while minifying " + block.type.toUpperCase() + ": ");
                console.log(error);
                return;
            }

            try {
                var revPath = hashFilename(block.dest, fileContents);

                console.log("Creating copy with hashed filename");
                fs.writeFileSync(revPath, fileContents);
            }
            catch (error) {
                console.log("ERROR while hashing: ");
                console.log(error);
                return;
            }

            try{
                var blockLine = block.raw.join(proc.linefeed);
                var replacement = proc.replaceWith(block);
                replacement = replacement.replace(path.basename(block.relativeDest), path.basename(revPath));
                console.log("New reference: " + replacement);

                lockFile.lockSync("lockfile.lock", {retries:10});

                if(sourceHtml.length <= 0){
                    console.log("ERROR reading " + options.htmlFile + ", it appears to be empty");
                    return;
                }

                sourceHtml = sourceHtml.replace(blockLine, replacement);
            }
            catch(e){
                console.log("ERROR while creating new reference: ");
                console.log(e);
                return;
            }
            finally{
                // Clean up
                lockFile.unlockSync("lockfile.lock");
            }

        });
        console.log("Writing to HTML source file");
        fs.writeFileSync(options.outputHtmlFile, sourceHtml, "utf8");
        console.log("Hashcat complete");
    });
};


exports.hashcatify = hashcatify;
