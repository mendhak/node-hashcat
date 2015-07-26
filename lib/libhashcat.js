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

            if(block.type=="css")
            {
                try {
                    fileContents = combineCss(block.src);
                }
                catch (error) {
                    console.log("ERROR while minifying CSS: ");
                    console.log(error);
                    return;
                }
            }
            else {

                try{
                    console.log("Minifying JS");
                    var uglify = require("uglify-js");
                    var uglified = uglify.minify(block.src, {compress:false});
                    fileContents = uglified.code;
                }
                catch(e){
                    console.log("ERROR while minifying JS: ");
                    console.log(e);
                    return;
                }

            }

            try{
                console.log("Getting hash of file");
                var hash = crypto.createHash("md5").update(fileContents).digest("hex");
                var revPath = (path.join(path.dirname(block.dest), hash.substr(0, 8) + "." + path.basename(block.dest)));

                console.log("Creating copy with hashed filename");

                var readStream = new stream.Readable();
                readStream.push(fileContents);
                readStream.push(null);
                readStream.pipe(fs.createWriteStream(revPath));
            }
            catch(e){
                console.log("ERROR while hashing: ");
                console.log(e);
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
