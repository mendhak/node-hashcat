var fs = require("fs");
var path = require("path");
var stream = require("stream");
var crypto = require("crypto");
var HTMLProcessor = require("../lib/htmlprocessor");

function readFileSync(file) {
    return fs.readFileSync(file).toString();
}

function concat(a, b) {
    return a + b;
}

function combineCss(sources) {
    var cleanCSS = require("clean-css");

    console.log("Concatenating CSS");
    var concatenatedCss = sources.map(readFileSync).reduce(concat, "");

    console.log("Minifying CSS");
    return cleanCSS.process(concatenatedCss);
}

function combineJs(sources) {
    var uglify = require("uglify-js");

    console.log("Minifying JS");
    var uglified = uglify.minify(sources, {compress: false});
    return uglified.code;
}

function hashFilename(filename, content) {
    console.log("Getting hash of file");
    var hash = crypto.createHash("md5").update(content).digest("hex");
    return path.join(path.dirname(filename), hash.substr(0, 8) + "." + path.basename(filename));
}

function processBlock(proc) {
    return function (block) {
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

        try {
            var blockLine = block.raw.join(proc.linefeed);
            var replacement = proc.replaceWith(block);
            replacement = replacement.replace(path.basename(block.relativeDest), path.basename(revPath));
            console.log("New reference: " + replacement);

            return {
                source: blockLine,
                dest: replacement
            };
        }
        catch (error) {
            console.log("ERROR while creating new reference: ");
            console.log(error);
            return;
        }
    };
}

function replace(string, replacement) {
    return string.replace(replacement.source, replacement.dest);
}

var hashcatify = function (settings) {
    var options = settings;
    options.htmlFile = path.join(process.cwd(), settings.htmlFile);
    options.outputHtmlFile = path.join(process.cwd(), settings.outputHtmlFile);
    console.log(options);
    begin(options);
};


var begin = function (options) {
    var sourceHtml = readFileSync(options.htmlFile);

    if (sourceHtml.length <= 0) {
        console.log("ERROR reading " + options.htmlFile + ", it appears to be empty");
        return;
    }

    var proc = new HTMLProcessor(path.dirname(options.htmlFile), null, sourceHtml);
    var replacements = proc.blocks.map(processBlock(proc));
    var destHtml = replacements.reduce(replace, sourceHtml);

    console.log("Writing to HTML source file");
    fs.writeFileSync(options.outputHtmlFile, destHtml, "utf8");
    console.log("Hashcat complete");
};


exports.hashcatify = hashcatify;
