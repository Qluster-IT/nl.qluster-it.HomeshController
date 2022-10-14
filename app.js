/* eslint-disable global-require */

'use strict';

const Homey = require('homey');

class BlackWholeController extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('BlackWholeController App has been initialized');

    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    if (process.env.DEBUG === '1') require('inspector').open(9223, '0.0.0.0', true);

    //
  }

}

module.exports = BlackWholeController;
