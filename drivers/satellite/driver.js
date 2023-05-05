'use strict';

const googleTTS = require('google-tts-api');
const { Driver } = require('homey');
const { httpsGet, Defer, httpsPost, httpPost } = require('../../lib/proto');
const _ = require('lodash-core');
const FtpClient = require('../../lib/ftp-client');

class SatelliteDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('SatelliteDriver has been initialized');
    this.ftpClient = new FtpClient();
    this.ftpClient.init({ip:this.homey.app.ip, port:this.homey.app.microWebServerFtpPort});
    this.homey.app.on('microWebServerFtpPort', (microWebServerFtpPort)=> {
      this.ftpClient.init({ip:this.homey.app.ip, port:microWebServerFtpPort});
    });



    
    const action_satellite_set_screensaver = this.homey.flow.getActionCard('action_satellite_set_screensaver');
    action_satellite_set_screensaver.registerRunListener(( args, state ) => {
      var defer = new Defer();
        try {
          if(!args.screensaver) return Promise.resolve(false);

          this.post('setScreensaver', args)
          .then((res)=>{
            if(res===true) defer.resolve(res);
            else defer.reject(res);
          })
          .catch((err)=>{
            defer.reject(err);
          });
      } catch (error) { 
        console.log('Error: ' + error);
        defer.reject('Something went wrong: ' +error);
      }
      return defer.promise;
    });
    action_satellite_set_screensaver.getArgument('screensaver').registerAutocompleteListener(async (query, args)=> {
      return await this.post('getScreensavers', args);
    });



    
    const action_satellite_play_url = this.homey.flow.getActionCard('action_satellite_play_url');
    action_satellite_play_url.registerRunListener(( args, state ) => {
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
        defer.reject('Something went wrong with the play url.');
      }
      return defer.promise;
    });


    
    const action_satellite_play_soundboard = this.homey.flow.getActionCard('action_satellite_play_soundboard');
    action_satellite_play_soundboard.registerRunListener(( args, state ) => {
      var defer = new Defer();
        try {
          if(!args.file) return Promise.resolve(false);

          this.post('playSoundboard', args)
          .then((res)=>{
            if(res===true) defer.resolve(res);
            else defer.reject(res);
          })
          .catch((err)=>{
            defer.reject(err);
          });
      } catch (error) { 
        console.log('Error: ' + error);
        defer.reject('Something went wrong with the play soundboard.');
      }
      return defer.promise;
    });    
    action_satellite_play_soundboard.getArgument('file').registerAutocompleteListener(async (query, args) => {
      try {
        let r = await this.post('getSoundboards', args);
        return r;
      } catch (error) { this.error('action_satellite_play_soundboard.file.registerAutocompleteListener.error :', error); throw error; }
    });

    
    const action_satellite_play_microwebserver = this.homey.flow.getActionCard('action_satellite_play_microwebserver');
    action_satellite_play_microwebserver.registerRunListener(( args, state ) => {
      var defer = new Defer();
        try {
          if(!args.file) return Promise.resolve(false);
          if(args && args.file && args.file.isFile!=='true' && args.file.isFile !== true) return Promise.reject(new Error('A file must be selected.'));

          let url = `http://${this.homey.app.ip}:5080/` + args.file.id;
          
          this.post('playUrl', {device:args.device, url})
          .then((res)=>{
            if(res===true) defer.resolve(res);
            else defer.reject(res);
          })
          .catch((err)=>{
            defer.reject(err);
          });
      } catch (error) { 
        console.log('Error: ' + error);
        defer.reject('Something went wrong with the play Micro Web Server.');
      }
      return defer.promise;
    });    
    action_satellite_play_microwebserver.getArgument('file').registerAutocompleteListener(async (query, args) => {
      try {
        let path = (args.file ? (args.file.isDirectory==='true' ? args.file.id : args.file.path) : query) || '';
        let pathsAbove = path.split('/');
        pathsAbove.pop();
        let pathAbove = pathsAbove.join('/');
        let r = await this.getFtpList({path});
        
        
        r = r.map(x=>{return {id:`${path}${path?'/':''}${x.name}`, name:`${path}${path?'/':''}${x.name}`, path, description:path, isDirectory:x.isDirectory, isFile:x.isFile}; });        
        r = _.orderBy(r, x=>(x.isDirectory ? '0.' : '1.') + x.name);
        if(pathAbove && pathAbove.length) r.unshift({id:pathAbove, name:pathAbove, description:'..', isDirectory:true, isFile:false});
        return r;

      } catch (error) { this.error('action_satellite_play_microwebserver.file.registerAutocompleteListener.error :', error); throw error; }
    });

    
    var says = [
      {id:'action_satellite_say', slow:false}
      // {id:'start_googletts_slow', slow:true},        
      // {id:'start_googletts_af', slow:false, af:true},
      // {id:'start_googletts_slow_af', slow:true, af:true}
    ];
    for (let i = 0; i < says.length; i++) {
      const start = says[i];        
      const start_googlettsAction = this.homey.flow.getActionCard(start.id);
      start_googlettsAction.registerRunListener(( args, state ) => { //async              
        const defer = new Defer();
        try {
          if(!args.device || !args.text) return false;
          if(args.text.length>200) return  new Error("Max 200 characters");
          const settings =  args.device.getSettings();
          const languagecode = settings && settings.languagecode ? settings.languagecode : 'en-GB';
          const url = googleTTS.getAudioUrl(args.text, { lang:languagecode, slow: start.slow });

          this.post('playUrl', {device:args.device, url});
          //this.Triggers.urlTrigger.Card.trigger(args.device, {url:url, text:args.text} );

          defer.resolve(start.af ? {url:url, text:args.text} : true);
        } catch (error) { console.log('Error: ' + error); defer.resolve('An error occured'); }
          return defer.promise;
      });
    }


    var saysAthom = [
      {id:'action_satellite_say_athom'}
    ];
    for (let i = 0; i < saysAthom.length; i++) {
      const start = saysAthom[i];        
      const sayAthomAction = this.homey.flow.getActionCard(start.id);
      sayAthomAction.registerRunListener(( ( args, state ) => {
        const defer = new Defer();
        try {
          if(!args.device || !args.text) return defer.resolve(false);

          this.post('sayAthom', args);
          defer.resolve(true);

        } catch (error) { console.log('Error: ' + error); defer.resolve('An error occured'); }
          return defer.promise;
      }).bind(this));
    }


    
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
            args.name  = args.name && args.name.name ? args.name.name : args.namebytag ;
            delete args.namebytag;
            for (let j = 1; j <= action.textCount; j++) if (args['text' + j.toString()] === undefined) args['text' + j.toString()] = "";
            for (let j = 1; j <= action.numberCount; j++) if (args['number' + j.toString()] === undefined) args['number' + j.toString()] = 0;
            for (let j = 1; j <= action.booleanCount; j++) if (args['boolean' + j.toString()] === undefined) args['boolean' + j.toString()] = false;
              
            let promise = this.post('startFlow', args);
            
            if (!args.waittofinish || args.waittofinish=='waittofinish' ) {
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


  async getFtpClient() {    
    if(!this.ftpClient) this.ftpClient = new FtpClient();
    return this.ftpClient;
  }
  async getFtpList({path}) {
    return this.ftpClient.getList({path}) ;
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
        name: discoveryResult.txt.name ,
        data: {
          id: discoveryResult.id,
        },
        store:{address:discoveryResult.address}
      };
    });
    let foundDevices = [];
    for (const device of devices) {
      if(await this.isOnline(device.store.address)) foundDevices.push(device);
    }

    return foundDevices;
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


  async isOnline(address) {
    let defer = new Defer();
    //https://${device.store.address.replace('.','-')}.homey.homeylocal.com/api/app/nl.qluster-it.HomeshSatellite/getauthorization/
    httpPost({url:`http://${address}/api/app/nl.qluster-it.HomeshSatellite/isonline/`, body:{}})
    .then((body,b)=>{
      this.log('isOnline successfull', address, body);
      defer.resolve(true);
    }).catch((error,b)=>{
      this.error('isOnline error', address, error);
      defer.resolve(false);
    });
    return defer.promise;
  }

  getAuthorization({device, pincode}) {
    let defer = new Defer();
    //https://${device.store.address.replace('.','-')}.homey.homeylocal.com/api/app/nl.qluster-it.HomeshSatellite/getauthorization/
    httpPost({url:`http://${device.address || device.store.address}/api/app/nl.qluster-it.HomeshSatellite/getauthorization/`, body:{pincode}})
    .then((body,b)=>{
      this.log('getAuthorization successfull', body);
      
      if(body.token) defer.resolve(body); else defer.reject('Pincode invalid.');
    }).catch((error,b)=>{
      this.error('getAuthorization error', error);
      defer.reject(error);
    });
    return defer.promise;
  }

  
  post(callName, args) {
    let device = args.device;
    delete args.device;
    args.token = device.token;
    let defer = new Defer();
    httpPost({
      url:`http://${device.address}/api/app/nl.qluster-it.HomeshSatellite/${callName}/`, 
      body:args
    })
    .then((body,b)=> {
      if(body && body.__error__)this.handleError({id:'post:'+callName, error:body.__error__, device, defer});
      else defer.resolve(body);
     })
    .catch((error,b)=> this.handleError({id:'post:'+callName, error, device, defer}));
    return defer.promise;  
  }

  
async handleError({id, error, device, defer}) {
  this.error('handleError id', id, 'Error:', error);
  let err = error.message || error;
  switch (err) {
    case 'HTTP status code 404':
      defer.reject(new Error('Are you sure you have the Homey Satellite App running on the satellite device?'));
      return;
    case 'Unauthorized':
      defer.reject(new Error('Unauthorized. Reconnect the Satellite by repairing and re-entering the pincode.'));
      return;
    default:
      break;
  }
  defer.reject(typeof(error)=='string' ? new Error(error) : error);
  //device.setUnavailable('Token invalid! Repair your device.');
}

  async getEventNames({ targetCard, query, args, isAction = false } = {}) {
    let r = (await this.post('getFlowEventNames', {device:args.device, query:query}));//.map(x=>{ return {name:x};} );
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
