(function config() {

  var path = require('path');

  exports.load = function load(fileName, handler) {
    console.log("Loading config " + fileName + "...");
    handler(require(path.join(process.cwd(), fileName)));
  };

})();
