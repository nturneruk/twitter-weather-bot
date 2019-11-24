var request = require('request');
var Twit = require('twit')
var configs = require('./configs');

var TwitterApi = new Twit(configs);

var currentTemp;
var minimumTemp;
var maximumTemp;
var weatherDescription;
var windSpeed;
var status;

var url = configs.apiLink + configs.city + ',' + configs.country + configs.appID[0] + configs.appID[1] + configs.units[0] + configs.units[1];

var stream = TwitterApi.stream('statuses/filter', { track: [configs.username] });
stream.on('tweet', TweetEvent);

/**
 * Calls the OpenWeather api to get the current temperature, min & max temperature for the day, the wind speed and the weather description.
 * Temperature is in Celsius.
 * Wind Speed is in m/s.
 * @param {string} city is optional, if it's provided it will replace it in the request url, if its null it will use the default one from the configs. 
 * @param {string} country is optional, if it's provided it will replace it in the request url, if its null it will use the default one from the configs. 
 */
async function GetData(city,country){

    return new Promise(resolve => {

        if (city !== undefined && country !== undefined){
            url = configs.apiLink + city + ',' + country + configs.appID[0] + configs.appID[1] + configs.units[0] + configs.units[1];
        }

        request({ url:url, json:true }, function (error, response, body){

            if(!error && response.statusCode === 200){
                currentTemp = body.main.temp;
                minimumTemp = body.main.temp_min;
                maximumTemp = body.main.temp_max;
                humidity = body.main.humidity;
                windSpeed = body.wind.speed;
                weatherDescription = body.weather[0].description;
                
                resolve();            

            } else {
                console.log("Error triggered inside of the GetData function.");
                console.log(error);
                throw new Error("Sorry I couldn't find the weather for your city. Can you ask me for another one ?");
            }
        })
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
}

/**
 * Converts the speed in m/s passed as a parameter to Km/h
 * @param {number} speed 
 */
function ConvertMetersPerSecondToKmPerHour(speed){
    return (speed * 3.6).toFixed(0);
}

/**
 * Setter for the status variable.
 */
function SetStatus(tweeterUsername){
    // if the tweeterUsername is defined that means that we are replying to a tweet.
    if(tweeterUsername !== undefined){ 
        status = "Here is the weather for " + city + 
                 " @" + tweeterUsername + " .\n";      
    }
    
    status = status +
            "Currently "+ city +
            " is experiencing " + weatherDescription + 
            " at " + currentTemp + "°C." +
            "\n" +"Daily forecast: min of " + minimumTemp + 
            "°C " + "& a max of " + maximumTemp + 
            "°C with " + humidity + "% Humidity" +
            " & "+ (windSpeed) + "Km/h Wind.\n";
}

/**
 * Gets the weather data for Montreal then tweets it.
 */
function Tweet(){  

    GetData().then(function(){
        CleanData();
        SetStatus();

        var params = {
            status: status
        }

        TwitterApi.post('statuses/update', params, callback);

        function callback(error){
            if(error){
              console.log(error);
            } else {
              console.log("Tweeted successfully: \n" + weatherUpdate);
            }
        }
    });
}

/**
 * Parses the tweet and returns an array of [City,CountryCode]
 * @param {string} tweet 
 */
function ParseTweet(tweet){
    // The regex expression is designed to match with any tweet like this : @mtlweatherbot Montreal,Ca
    // Here is a break down of the Regex expression by sections
    // @MtlWeatherBot :  Matches "@Mtlweatherbot " (with a space after the username)
    // (([a-z]*)|([a-z]* [a-z]*)) : Matches any 1 word composted with  characters from a to z  or any 2 words with a space in between
    // ,[a-z]{2} : Matches any 2 character country code preceded by a comma
    // $ : Matches the end of a string
    // the "i" parameter is a flag to ignore the case 
    var regexExpression = new RegExp("@MtlWeatherBot (([a-z]*)|([a-z]* [a-z]*)),[a-z]{2}$","i");
    
    if(regexExpression.test(tweet) === true){
        //returns an array of [City, CountryCode]
        return tweet.substring(15).split(',');
    } else {
        throw new Error("Sorry I couldn't understand what you tweeted. Try the following format: @ mtlweatherbot ,Montreal,CA");
    }       
}

/**
 * Fires up when someone tweets at the bot.
 * Gets & cleans the data requested by the user and it tweets a reply.
 * @param {Twit.Stream} tweet 
 */
function TweetEvent(tweet){
    
    var tweeterUsername = tweet.user.screen_name;
    var replyID = tweet.id_str;

    try {

        parsedTweet = ParseTweet(tweet.text);
        city = parsedTweet[0];
        country = parsedTweet[1];

        GetData(city,country).then(function(){

            CleanData();
            SetStatus(tweeterUsername);

            params = {
                status : status,
                in_reply_to_status_id : replyID
            }
    
            TwitterApi.post('statuses/update', params, callback);

            function callback(error){
                if(error){
                    console.log(error);
                } else {
                    console.log("Replied successfully: \n" + params.status);
                }
            }
        });

    } catch (error) {

        params = {
            status : '@'+ tweeterUsername + " " + error.message,
            in_reply_to_status_id : replyID
        }

        TwitterApi.post('statuses/update', params, callback);

        function callback(error){
            if(error){
                console.log(error);
            } else {
                console.log("Replied successfully: \n" + params.status);
            }
        }
    }

}


/**
 * Calls the Tweet function once every hour 
 * The second parameter is in milliseconds 
 */
setInterval(Tweet,1000*60*60); 

