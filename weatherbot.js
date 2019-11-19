var request = require('request');
var Twit = require('twit')
var configs = require('./configs');

var TwitterApi = new Twit(configs);

var currentTemp;
var minimumTemp;
var maximumTemp;
var weatherDescription;
var windSpeed;

var url = configs.apiLink + configs.city + configs.appID[0] + configs.appID[1] + configs.units[0] + configs.units[1];

/**
 * Calls the OpenWeather api to get the current temperature, min & max temperature for the day, the wind speed and the weather description.
 * Temperature is in Celsius.
 * Wind Speed is in m/s.
 */
function GetData(){
    request({ url:url, json:true }, function (error, response, body){
        if(!error && response.statusCode === 200){
            currentTemp = body.main.temp;
            minimumTemp = body.main.temp_min;
            maximumTemp = body.main.temp_max;
            humidity = body.main.humidity;
            windSpeed = body.wind.speed;
            weatherDescription = body.weather[0].description;
            
            CleanData();

        } else {
            console.log("Error triggered inside of the GetData function.");
            console.log(error);
        }
    })
}

/**
 * Converts The wind speed into KM/h and calls the Tweet temp function.
 */
function CleanData(){
    currentTemp = currentTemp.toFixed(0);
    minimumTemp = minimumTemp.toFixed(0);
    maximumTemp = maximumTemp.toFixed(0);
    windSpeed = ConvertMetersPerSecondToKmPerHour(windSpeed);
    Tweet();
}


/**
 * Converts the speed in m/s passed as a parameter to Km/h
 * @param {number} speed 
 */
function ConvertMetersPerSecondToKmPerHour(speed){
    return (speed * 3.6).toFixed(0);
}


/**
 * Tweets the weather update with the gathered data.
 */
function Tweet(){
    var weatherUpdate = 
        "Currently "+ configs.city +
        " is experiencing " + weatherDescription + 
        " at " + currentTemp + "°C." +
        "\n" +"Daily forecast: min of " + minimumTemp + 
        "°C " + "& a max of " + maximumTemp + 
        "°C with " + humidity + "% Humidity" +
        " & "+ (windSpeed) + "Km/h Wind.\n" + 
        "#Montreal #MontrealWeather"
    
    var tweet = {
        status: weatherUpdate
    }

    TwitterApi.post('statuses/update',tweet, callback);

    function callback(error){
        if(error){
          console.log(error);
        } else {
          console.log("Tweeted successfully: \n" + weatherUpdate);
        }
    }
}


GetData();


/**
 * Calls the getData function once every hour 
 * The second parameter is in milliseconds 
 */
setInterval(GetData,1000); 