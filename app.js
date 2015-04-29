// call the packages that is need
var express = require('express'),
    app = express(),
    cons = require('consolidate'),
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    request= require("request"),  
    bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

var port = process.env.PORT || 8080;        // set port

// ROUTES FOR API
var router = express.Router(); 

//Connect DB with Mongodb driver
var mongoclient = new MongoClient(new Server("localhost", 27017));
var db = mongoclient.db('weather');
var collection= db.collection('temperature')

//variable
var p= {
  api_key: "3aa03d04784744b946d1416d433da1d4",
  city: "Yangon,mm",
  units: "metric"
};

//openWeatherMap API URL
var url= "http://api.openweathermap.org/data/2.5/weather?"

//Calling the openWeatherMap api every 5mins and save the data to temperature table
setInterval(function() {
  var doc= request({
    url: url+"APPID="+p.api_key+"&q="+p.city+"&units="+p.units,
    json: true 
  }, function (err, response, resp) {
      if (err) throw err;

      //Insert the data into DB
      //Set "autoReconnect=true" , not to close the DB connection
      collection.insert(resp, function(err, r) {
        if(err) throw err
        console.log("Data from openweathermap API is successfully inserted")
      });
  });
  //Request the API every 5 mins
}, 300000);

//Time converter, Unix time to Year/Month/Date
function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp*1000);
  var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var time = year + '/' + month + '/' + date;
  return time;
}

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.route('/')
  .get(function(req, res) {
    res.json({ message: 'Bello! welcome to Temperature api!' });   
  });

// create a new temperature (accessed at POST http://localhost:8080/api/temperature)
router.route('/temperature')
  .post(function(req, res) {
    doc= {}
    collection.save(doc, function(err, doc) {
      /* Save the data with req.params.year */
    });
  })

// update the temperature with :year)
router.route('/temperature/:year')
  .put(function(req, res) {
    collection.findById(req.params.year, function(err, doc) {
      /* Updated the data with req.params.year */
    });
  });

//Delete the data which is from request params
router.route('/temperature/:id')
  .delete(function(req, res) {
    Collection.remove({
        _id: req.params.id
    }, function(err, doc) {
        if (err)
            res.send(err);

        res.json({ message: 'Successfully deleted' });
    });
  });

//Get the temperature API 
router.route('/temperature/:year/:month/:day')
  .get(function(req, res){
    time= req.params.year+"/"+req.params.month+"/"+req.params.day

    var secondQuery = {}
    var arr= [], reqDate= [], index= [], temp= []
    
    data= false
    collection.find().toArray(function(err, firstRes){
      if (err) throw err
      for(var i = 0; i < firstRes.length; i++){
        secondQuery[firstRes[i].a] = firstRes[i].dt
        arr.push(firstRes[i])
      }
      for(var i = 0; i < arr.length; i++){
        reqDate.push(timeConverter(arr[i].dt))
      }

      for(var i = 0; i < reqDate.length; i++){
        if (reqDate[i] === time) {
          index.push(i)
          data= true
        }
      }

      //Check the request params "Date" is exist in the database
      if (data==true){
        for(var i = 0; i < index.length; i++){
          temp.push(arr[index[i]].main.temp)
        }

        //Finding Average temperature
        var avg =temp.map(function(x,i,arr){return x/arr.length}).reduce(function(a,b){return a + b})
        console.log({"temperature": parseFloat(avg.toFixed(2))})

        res.json({"temperature": parseFloat(avg.toFixed(2))})
      }else{
        res.json("No result found, check your input date")
      }
    });//first Collection 
  });

router.route('*')
  .get(function(req, res){
    res.send('Page Not Found', 404);
  });

//Register Router 
app.use('/api', router);

//Start Server
mongoclient.open(function(err, mongoclient) {

    if(err) throw err;

    app.listen(port);
    console.log('Express server started on port 8080');
});