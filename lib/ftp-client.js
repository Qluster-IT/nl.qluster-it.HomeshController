const ftp = require("basic-ftp") ;

module.exports = class FtpClient {
    
  async init({homey, ip, port}) {
    this.homey = homey;
    this.ip = ip;
    this.port = port;
    if(this.client) {
      try {
        this.client.close();
      } catch (error) { }
      delete this.client;      
    }
  }

  async getList({path}) {
    let ftp = await this.getClient();
    try {      
      return await ftp.list(path);
    } catch (error) {
      ftp = await this.getClient({refresh:true});
      return await ftp.list(path);
    }
  }


  async getClient({refresh}={}) {
    if(refresh && this.client) {
      try {
        this.client.close();
      } catch (error) { }
      delete this.client;
    }
    if(!this.client) {
      this.client = new ftp.Client();
      this.client.ftp.verbose = true;
      try {
          await this.client.access({
              host: this.ip,
              port:this.port
              // user: "very",
              // password: "password",
              // secure: true
          });
          //console.log(await this.client.list());
        }
        catch(err) {
            console.log(err);
        }
    }
    return this.client;
  }

  close() {
    if(this.client) this.client.close();
  } 
};