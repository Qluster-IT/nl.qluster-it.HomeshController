'use strict';

const { Driver } = require('homey');
const { httpsGet, Defer, httpsPost, httpPost } = require('../../lib/proto');
const _ = require('lodash-core');

class SatelliteDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('SatelliteDriver has been initialized');

    
    const action_satellite_play_url = this.homey.flow.getActionCard('action_satellite_play_url');
    action_satellite_play_url.registerRunListener(( ( args, state ) => {
      var defer = new Defer();
        try {
          if(!args.url) return Promise.resolve(false);
                    
          this.playUrl(args)
          .then((res)=>{
            if(res===true) defer.resolve(res);
            else defer.reject(res);
          })
          .catch((err)=>{
            defer.reject(err);
          });
      } catch (error) { 
        console.log('Error: ' + error);
        defer.reject('Something went wrong with the url.');
      }
      return defer.promise;
    }).bind(this));

    
    //#region Actioncards startFlow
    var actions = this.actions = [
      { id: 'action__satellite_startflow__text1_number1_boolean1' }
    ];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const actionCard = this.homey.flow.getActionCard(action.id);
      action.card = actionCard;
      this.setCounts(action);
      
      actionCard.registerRunListener(async (args, state, more) => { //async
        var defer = new Defer();
        try {
          args.name  = args.name || { name: args.namebytag } ;
          delete args.namebytag;
          for (let j = 1; j <= action.textCount; j++) if (args['text' + j.toString()] === undefined) args['text' + j.toString()] = "";
          for (let j = 1; j <= action.numberCount; j++) if (args['number' + j.toString()] === undefined) args['number' + j.toString()] = 0;
          for (let j = 1; j <= action.booleanCount; j++) if (args['boolean' + j.toString()] === undefined) args['boolean' + j.toString()] = false;
            
          let promise = this.startFlow(args);
          
          if (!(args.waittofinish === false)) {
            return await promise;
          } else {
            return {text1:'', number1:0, boolean1:false};
          }
        } catch (error) {
          console.log('Error: ' + error);
          defer.reject(error);
        }
        return defer.promise;
      });

      actionCard.getArgument('name').registerAutocompleteListener(async (query, args) => {
        try {
          action.lastName = query;
          return await this.getEventNames({ targetCard: action.triggerCard, query: query, args: args, isAction: true });
        } catch (error) { this.error('action.name.registerAutocompleteListener.error :', error); throw error; }
      });
    }

    //#endregion


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
        store:{address:discoveryResult.address}
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
      let authorization = await this.getAuthorization({device, pincode:pincode.join('')});
      if(authorization && authorization.token) {
        device.store.token = authorization.token;
        this.token = authorization.token;
        return true;
      }
      return false;
    });

  }
  
  async onRepair(session, device) {
    
    session.setHandler('pincode', async (pincode) => {
      // The pincode is given as an array of the filled in values
      let authorization = await this.getAuthorization({device, pincode:pincode.join('')});
      if(authorization && authorization.token) {
        device.setToken(authorization.token);
        device.setAvailable();
        return true;
      }
      return false;
    });
  }


  getAuthorization({device, pincode}) {
    let defer = new Defer();
    //https://${device.store.address.replace('.','-')}.homey.homeylocal.com/api/app/nl.qluster-it.HominySatellite/getauthorization/
    httpPost({url:`http://${device.address || device.store.address}/api/app/nl.qluster-it.HominySatellite/getauthorization/`, body:{pincode}})
    .then((body,b)=>{
      this.log('getAuthorization successfull', body);
      
      if(body.token) defer.resolve(body); else defer.reject('Pincode invalid.');
    }).catch((error,b)=>{
      this.error('getAuthorization error', error);
      defer.reject(error);
    });
    return defer.promise;
  }

  getFlowEventNames({device, query}) {
    let defer = new Defer();
    httpPost({
      url:`http://${device.address}/api/app/nl.qluster-it.HominySatellite/getFlowEventNames/`, 
      body:{token:device.token, query}
    })
    .then((body,b)=>  defer.resolve(body) )
    .catch((error,b)=> this.handleError({id:'getFlowEventNames', error, device, defer}));
    return defer.promise;
  }

  startFlow({device, name, text1, number1, boolean1}) {
    let defer = new Defer();
    httpPost({
      url:`http://${device.address}/api/app/nl.qluster-it.HominySatellite/startFlow/`, 
      body:{token:device.token, name, text1, number1, boolean1}
    })
    .then((body,b)=>  defer.resolve(body) )
    .catch((error,b)=> this.handleError({id:'startFlow', error, device, defer}));
    return defer.promise;
  }


  playUrl({device, url}) {
    let defer = new Defer();
    httpPost({
      url:`http://${device.address}/api/app/nl.qluster-it.HominySatellite/playUrl/`, 
      body:{token:device.token, url}
    })
    .then((body,b)=>  defer.resolve(body) )
    .catch((error,b)=> this.handleError({id:'startUrl', error, device, defer}));
    return defer.promise;
  }




  
async handleError({id, error, device, defer}) {
  this.error('getFlowEventNames error', error);
  defer.reject(error);
  //device.setUnavailable('Token invalid! Repair your device.');
}

  async getEventNames({ targetCard, query, args, isAction = false } = {}) {
    let r = (await this.getFlowEventNames({device:args.device, query:query}));//.map(x=>{ return {name:x};} );
    return r;
  }

  
  //#region Functions the same as AdvancedTriggers
  
  setCounts(card) {
    card.textCount = card.numberCount = card.booleanCount = card.jsonCount = 0;
      var arrArgumentTypes = _.last(card.id.split('__')).split('_');
      for (let i = 0; i < arrArgumentTypes.length; i++) {
        const type = arrArgumentTypes[i];
        if(type.startsWith('text')) card.textCount = Number.parseInt(type.replace('text',''));
        else if(type.startsWith('number')) card.numberCount = Number.parseInt(type.replace('number',''));
        else if(type.startsWith('boolean')) card.booleanCount = Number.parseInt(type.replace('boolean',''));    
        else if(type.startsWith('json')) card.jsonCount = Number.parseInt(type.replace('json',''));    
      }
  }

  //#endregion




 }

module.exports = SatelliteDriver;
