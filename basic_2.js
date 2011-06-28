var express = require('express'),
  Db = require('mongodb').Db,
  Server = require('mongodb').Server,
  Connection = require('mongodb').Connection,  
  http = require('http'),
  debug = require('util').debug,
  inspect = require('util').inspect;
  
var host = 'localhost';
var port = Connection.DEFAULT_PORT;
var db = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:false});

var ObjectID = db.bson_serializer.ObjectID;

var app = express.createServer(
  express.cookieParser(),
  express.bodyParser(),
  express.session({ secret: 'keyboard cat' })
);

app.use(express.methodOverride());
app.set('view engine', 'jade');
app.set('view options', {layout: false});

//  !!! CHANGE
app.get('/', function(req, res){
  db.collection('locations', function(err, collection) {

    // Fetch all docs for rendering of list
    collection.find({}).toArray(function(err, items) {            
      res.render('./basic_2.jade', {locals: {locations:items}});
    })          
  });
});

db.open(function(err, db) {
  if(err) throw err    
  app.listen(8124);
});

//  !!! CHANGE
var geoCodeDecorateObject = function(address, object, callback) {
  var googleGeoCodeApi = {
    host: 'maps.googleapis.com',
    port: 80,
    path: '/maps/api/geocode/json?sensor=false&address=' + escape(address),
    method: 'GET'
  };  
  
  var clientReq = http.get(googleGeoCodeApi, function(clientRes) {
    var data = [];
    
    clientRes.on('data', function(chunk) {
      data.push(chunk.toString());            
    });
    
    clientRes.on('end', function() {
      var googleObject = JSON.parse(data.join(''));

      object.address = address;
      object.geodata = googleObject.results.pop();      

      callback(null, object);        
    });
  });
  
  clientReq.end();  
}


//  !!! CHANGE
// Create method
app.post('/location', function(req, res) {
  geoCodeDecorateObject(req.body.address, {description:req.body.description}, function(err, object) {
    db.collection('locations', function(err, collection) {
      
      // Insert doc
      collection.insert(object, {safe:true}, function(err, result) {
      
        // Fetch all docs for rendering of list
        collection.find({}).toArray(function(err, items) {            
          res.render('./basic_2.jade', {locals: {locations:items}});
        })          
      });        
    });
  });
});