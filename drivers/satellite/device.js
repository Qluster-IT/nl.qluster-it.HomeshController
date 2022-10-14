'use strict';

const { Device } = require('homey');

class HomeySatelliteDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('HomeySatelliteDevice has been initialized');
    this.address = await this.getStoreValue('address');
    this.token = await this.getStoreValue('token');

    if(!this.token && this.driver.token) {
      this.token = this.driver.token;
      delete this.driver.token;
      await this.setStoreValue('token', this.token);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('HomeySatelliteDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('HomeySatelliteDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('HomeySatelliteDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('HomeySatelliteDevice has been deleted');
  }


  
  onDiscoveryResult(discoveryResult) {
    // Return a truthy value here if the discovery result matches your device.
    this.log('onDiscoveryResult: ', discoveryResult);
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult) {
    this.setAddress(discoveryResult.address);

    // this.api = new MyDeviceAPI(discoveryResult.address);
    // await this.api.connect(); // When this throws, the device will become unavailable.
  }

  onDiscoveryAddressChanged(discoveryResult) {
    this.setAddress(discoveryResult.address);
    
    // this.api.address = discoveryResult.address;
    // this.api.reconnect().catch(this.error);
  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    this.setAddress(discoveryResult.address);
    
    // When the device is offline, try to reconnect here
    // this.api.reconnect().catch(this.error);
  }

  setAddress(address) {
    this.setStoreValue('address', address);
    this.address = address;
  }

}

module.exports = HomeySatelliteDevice;
