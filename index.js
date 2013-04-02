#!/usr/bin/env node

'use strict'


var http = require('http')
var https = require('https')
var join = require('path').join
var parseUrl = require('url').parse

var DropboxForward = module.exports = function(dropbox_id, errorResponse){
  var prefix = '/u/' + dropbox_id
  var host = 'dl.dropboxusercontent.com'
  var protocol = 'https://'
  return function(req, res, next){
    if(typeof next == 'undefined')
      next = error

    var urlObj = parseUrl(req.url)
    //check for existence / index.html
    //TODO: clean this up 1000%
    check(urlObj.pathname, function(err, path){
      if(err) next(err)
      redirect(path + (urlObj.search || ''))
    })

    function check(path, cb){
      path || (path = '/')
      https.request({method:'head', host: host, path: join(prefix + path), agent: false})
        .on('response', function(response){
          if(response.statusCode == 200){
            cb(null, path)
          } else if(response.statusCode == 404 || (path == '/' && response.statusCode == 400)){ //hitting user's root will return 400, not 404
            if(path.match(/index.html$/)){
              var err = new Error('Not Found')
              err.statusCode = 404
              next(errorResponse && err)
            } else {
              check(join(path, 'index.html'), cb)
            }
          } else {
            var err = new Error('Response Code: ' + response.statusCode)
            err.statusCode = response.statusCode
            next(err)
          }
        })
        .on('error', function(err){
          cb(err)
        })
        .end()
    }

    function redirect(path){
      res.statusCode = 301
      res.setHeader('Location', protocol + host + join(prefix, path))
      res.end()
    }

    function error(err, code){
      res.statusCode = code || err.statusCode || 500
      res.end(err.message || err)
    }
  }
}

if(require.main == module){
  var config = require('./config.json')

  var server = http.createServer(DropboxForward(config.dropboxId, true))

  server.listen(config.port, config.host)
}
