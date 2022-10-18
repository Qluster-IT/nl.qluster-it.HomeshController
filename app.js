/* eslint-disable global-require */

'use strict';

const Homey = require('homey');
const { httpGet } = require('./lib/proto');

class HomeshController extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('HomeshController App has been initialized');

    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    if (process.env.DEBUG === '1') require('inspector').open(9223, '0.0.0.0', true);
    
    this.ip = (await this.homey.cloud.getLocalAddress()).split(':')[0];    
    this.microWebServerFtpPort = await this.homey.settings.get('microWebServerFtpPort');
    if(!this.microWebServerFtpPort) {      
      this.microWebServerFtpPort = 5081;
      this.homey.settings.set('microWebServerFtpPort', this.microWebServerFtpPort);
    }

    this.homey.settings.on('set', async (key)=> {
      switch (key) {
        case 'microWebServerFtpPort': 
        this.microWebServerFtpPort = await this.homey.settings.get('microWebServerFtpPort');
        this.emit('microWebServerFtpPort', this.microWebServerFtpPort);
        break;
      }
      if(key==='microWebServerFtpPort') {
        let a = 1;
      }

    });
    

    
  }

  // async onUninit() {
  //   if(this.client) this.client.close();
    
  // }

}

module.exports = HomeshController;
