if (process.platform === 'win32') {
  module.exports = require('./windows');
} else if (process.platform === 'darwin') {
  module.exports = require('./osx')
} else {
  module.exports = require('./linux');
}
