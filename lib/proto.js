
const https = require('https');

var zlib = require('zlib');

Array.prototype.contains = String.prototype.contains = function(v, requiresAll) { var _this=this; return typeof(v)=='object' ? (requiresAll? _.every :_.some)(v,function(a) { return _this.indexOf(a)>-1;}) : this && this.indexOf && this.indexOf(v)>-1;}


class Defer {    
    get isDefered() { return !!this._isDefered ; }
    set isDefered(v) { this._isDefered = v; }
    
    get promise() { return this._promise ; }
    set promise(v) { this._promise = v; }
    /**
     * 
     * @param {Number} timeout 
     */
    constructor(timeout) {
        
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        
        if(timeout!==undefined) {
            setTimeout(function () {
                if(!this.isDefered && this.promise && this.promise.resolve) this.promise.resolve();
            }.bind(this),timeout);
        }
        
        // this.isFulfilled = function() { return isFulfilled; };
        // this.isPending = function() { return isPending; };
        // this.isRejected = function() { return isRejected; };
    }
    then(fun) { this._promise.then(fun); }
    catch(fun) { this._promise.catch(fun); }
    finally(fun) { this._promise.finally(fun); }
    resolve(val1,val2,val3,val4) { this.isDefered=true; this._resolve(val1,val2,val3,val4); }
    reject(val1,val2,val3,val4) { this.isDefered=true; this._reject(val1,val2,val3,val4); }
}

if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var match = funcReg.exec(this.replace(/\n/g, ' '));

        if(match) {
            return new Function(match[1].split(','), match[2]);
        }

        return null;
    };
}

function gzip(input, options) {
    return new Promise(function (resolve, reject) {
      zlib.gzip(input, options, function (err, result) {
        if (!err) resolve(result);
        else reject(Error(err));
      });
    });
  }
  function ungzip(input, options) {
    return new Promise(function (resolve, reject) {
      zlib.gunzip(input, options, function (err, result) {
        if (!err) resolve(result);
        else reject(Error(err));
      });
    });
  }
  
  function httpsGet({url}) {
    let defer = new Defer();

    https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            defer.resolve(data);
        });

        }).on("error", (err) => {defer.reject(err);});
    return defer.promise;
}

async function httpsPost({url, body}) {
  const dataString = JSON.stringify(body);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length,
    },
    timeout: 10000, // in ms
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        return reject(new Error(`HTTP status code ${res.statusCode}`));
      }

      const body = []
      res.on('data', (chunk) => body.push(chunk))
      res.on('end', () => {
        const resString = Buffer.concat(body).toString();
        resolve(resString);
      })
    })

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request time out'));
    });

    req.write(dataString);
    req.end();
  });
}

// function httpsPost({url, body}) {
//   let defer = new Defer();
//   const https = require('https');
  
//   var options = {
//     hostname: 'posttestserver.com',
//     port: 443,
//     path: '/post.php',
//     method: 'POST',
//     headers: {
//          'Content-Type': 'application/json',
//          'Content-Length': postData.length
//        }
//   };
//   https.request(url, body, (resp) => {
//       let data = '';
//       resp.on('data', (chunk) => {
//           data += chunk;
//       });

//       // The whole response has been received. Print out the result.
//       resp.on('end', () => {
//           defer.resolve(data);
//       });

//       }).on("error", (err) => {defer.reject(err);});
//   return defer.promise;
// }

module.exports = { Defer, gzip, ungzip, httpsGet, httpsPost};