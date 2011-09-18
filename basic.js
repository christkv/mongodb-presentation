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

app.get('/', function(req, res){
  db.collection('locations', function(err, collection) {

    // Fetch all docs for rendering of list
    collection.find({}).toArray(function(err, items) {            
      res.render('./basic.jade', {locals: {locations:items}});
    })          
  });
});

db.open(function(err, db) {
  if(err) throw err    
  
  //  !!! CHANGE
  db.ensureIndex("locations", {loc:"2d"}, function(err, result) {
    if(err) throw err    
    
    app.listen(8124);
  })  
});

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
      
      //  !!! CHANGE
      object.loc =  {long:object.geodata.geometry.location.lng, lat:object.geodata.geometry.location.lat};

      callback(null, object);        
    });
  });
  
  clientReq.end();  
}

//  !!! CHANGE
// Search option
app.post('/search', function(req, res) {
  geoCodeDecorateObject(req.body.address, {}, function(err, object) {
    // Unpack geo object
    var long = object.geodata.geometry.location.lng;
    var lat = object.geodata.geometry.location.lat

    db.collection('locations', function(err, collection) {
      collection.find({loc : {'$near': [long, lat], '$maxDistance': parseFloat(req.body.distance)}}).toArray(function(err, geoItems) {
        // Fetch all docs for rendering of list
        collection.find({}).toArray(function(err, items) {
          res.render('./basic.jade', {locals: {locations:items, results:geoItems}});
        })          
      });
    });
  });  
});

// Create method
app.post('/location', function(req, res) {
  geoCodeDecorateObject(req.body.address, {description:req.body.description}, function(err, object) {
    db.collection('locations', function(err, collection) {
      
      // Insert doc
      collection.insert(object, {safe:true}, function(err, result) {
      
        // Fetch all docs for rendering of list
        collection.find({}).toArray(function(err, items) {            
          res.render('./basic.jade', {locals: {locations:items}});
        })          
      });        
    });
  });
});

// Update method
app.put('/location', function(req, res) {
  var id = ObjectID.createFromHexString(req.body.id);
  db.collection('locations', function(err, collection) {

    collection.findOne({_id:id}, function(err, object) {
      object.description = req.body.description;
      object.address = req.body.address;

      geoCodeDecorateObject(req.body.address, object, function(err, object) {
        
        collection.update({_id:object._id}, object, {safe:true}, function(err, numberOfUpdatedObjects) {

          // Fetch all docs for rendering of list
          collection.find({}).toArray(function(err, items) {            
            res.render('./basic.jade', {locals: {locations:items}});
          })          
        })
      })
    });
  });
});

// Delete method
app.del('/location', function(req, res) {
  var id = ObjectID.createFromHexString(req.body.id);
  db.collection('locations', function(err, collection) {

    collection.remove({_id:id}, {safe:true}, function(err, numberOfDeletedRecords) {

      // Fetch all docs for rendering of list
      collection.find({}).toArray(function(err, items) {            
        res.render('./basic.jade', {locals: {locations:items}});
      })      
    })    
  });
});

// Get method
app.get('/location', function(req, res) {
  var id = ObjectID.createFromHexString(req.body.id);
  db.collection('locations', function(err, collection) {

    collection.findOne({_id:id}, function(err, item) {

      // Fetch all docs for rendering of list
      collection.find({}).toArray(function(err, items) {            
        res.render('./basic.jade', {locals: {locations:items, location:item}});
      })            
    })
  });
});