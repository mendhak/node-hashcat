exports.testSomething = function(test){
    b = require('../lib/libhashcat');
    test.equals('others', b.other());

    test.done();
};