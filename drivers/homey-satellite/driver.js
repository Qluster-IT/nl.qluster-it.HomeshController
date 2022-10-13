'use strict';

const { Driver } = require('homey');
const { httpsGet, Defer, httpsPost } = require('../../lib/proto');

class SatelliteDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    const devices = Object.values(discoveryResults).map((discoveryResult) => {
      return {
        name: discoveryResult.txt.name,
        data: {
          id: discoveryResult.id,
        },
      };
    });

    return devices;
  }

  async onPair(session) {
    let devices = await this.onPairListDevices();
    var device;
    
    session.setHandler('list_devices', async (data) => {
      // // emit when devices are still being searched
      // session.emit('list_devices', devices);
  
      // return devices when searching is done
      return devices;
  });
  
  session.setHandler('list_devices_selection', async (selectedDevices) => {
      device = selectedDevices[0];
  });


    session.setHandler('pincode', async (pincode) => {
      // The pincode is given as an array of the filled in values
      let a = await this.getAuthorization({pincode});
      return (
        pincode[0] === "1" && pincode[1] === "2"  && pincode[2] === "3" && pincode[3] === "4" 
        
        );
    });
  }

  getAuthorization({pincode}) {
    let defer = new Defer();
    httpsPost({url:'https://192-168-1-17.homey.homeylocal.com/api/app/nl.qluster-it.HominySatellite/getauthorization/', body:{pincode}})
    .then((body,b)=>{
      this.log('getAuthorization successfull', body);
      
      //defer.resolve(false);
    }).catch((error,b)=>{
      this.error('getAuthorization error', error);
      defer.reject(error);
    });
    return defer.promise;
  }
 }

module.exports = SatelliteDriver;
