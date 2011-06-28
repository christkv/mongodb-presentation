
var express = require('express'),
  Db = require('mongodb').Db,
  Server = require('mongodb').Server,
  Connection = require('mongodb').Connection,
  debug = require('util').debug,
  inspect = require('util').inspect;
  
var host = 'localhost';
var port = Connection.DEFAULT_PORT;
var db = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:false});
var app = express.createServer();

app.get('/', function(req, res){
    res.send('Hello World');
});

db.open(function(err, db) {
  if(err) throw err

  app.listen(8124);
});