hashcat
============

A commandline utility to concatenate, minify and cache-bust your Javascript references in HTML.

It works by parsing the HTML file for special markup.  It then concatenates, minifies, hashes and replaces references to those files.  It is ideal for use with a build tool as part of your CI pipeline.


##Usage

Prepare your references by surrounding them with special comment blocks.

    <!-- #cat app-min.js -->
    <script src="1.js" />
    <script type="text/javascript" src="other-folder/3.js"></script>
    <!-- endcat -->

Pass the HTML file to hashcat

    hashcat app/index.html
    
After processing, the above reference should be replaced with something like this:

    <script src="d41d8cd9.app-min.js"></script>

##Install

    npm install -g hashcat
    




