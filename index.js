'use strict';

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const https = require('https');
const iotData = new AWS.IotData({ endpoint: "us-east-1:609746199304" });
let yesOrNo= NaN;
let digProbYN = NaN;
let drinkingRecYN= NaN;
let diarrheaYN = NaN;
let puser, pname, pweight, ptime, psession;



// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to Doctor Belly Well. ' +
        'Please tell me your name';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me your name';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using doctor Belly Well. Have a great day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createNameAttributes(patientName) {
    return {
        patientName,
    };
}
//FOR WEIGHT OUTPUT NOT IN USE ATM
function createWeightAttributes(userWeight) {
    return {
        userWeight,
    };
}

//stores username
function setNameInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const strName = intent.slots.strname;
    pname=strName.value;
    puser=session.user.userId;
    psession=session.sessionId;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (strName) {
        const nameValue = strName.value;
        sessionAttributes = createNameAttributes(nameValue);
        newPatient(callback);
        speechOutput = `Welcome ${nameValue}. You can ask me ` +
            "things about your health!";
        repromptText = "You can ask me things about your health";
    } else {
        speechOutput = "I'm not sure who you are. Please tell me your name again.";
        repromptText = speechOutput;
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

//lets alexa ask for users weight
function askForWeight(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    speechOutput = `What is your current weight ${session.attributes.patientName}? `; 
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

//stores users weight
function currentWeight(intent, session, callback) {
    const cardTitle = intent.name;
    const weight = intent.slots.patientWeight;
    let speechOutput = '';
    let sessionAttributes = session.attributes;
    const shouldEndSession = false;

    if (weight) {
        const weightValue = weight.value;
        pweight = weightValue;
        let date = new Date();
        ptime = date.getTime();
        sessionAttributes += createWeightAttributes(weightValue);
        speechOutput = `Thank you ${pname} I saved your current weight. Do you need anything else? `; 
        newPatient(callback);

    } else {
        speechOutput = `Can I help you with anything else? ${pname}? `; 

    }
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

//saves a new Patient into the table
function newPatient(callback) {
    let params = {
        Item : {
            "id" : puser,
            "name" : pname,
            "weight" : pweight,
            "time_stamp" : ptime,
            "session_id" : psession
        },
        TableName : "healthdata"
    };
    dynamoDB.put(params, function(err, data){
        callback(err, data);
    });
}

//user can ask for his name
function getNameFromSession(intent, session, callback) {
    let patientName;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        patientName = session.attributes.patientName;
    }

    if (patientName) {
        speechOutput = `Your name is ${patientName}.`;
        shouldEndSession = false;
    } else {
        speechOutput = "I'm not sure who you are";
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

//user can ask for the last weight input NOT WORKING YET
function getLastWeight(intent, session, callback) {
    let lastWeight;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    
    
    let params = {
    TableName: "healthdata",
    KeyConditionExpression: "id = :puser",
    ExpressionAttributeValues: {
        ":weight": pweight
    },
    ScanIndexForward: "false",
    Limit: 1
    };

    lastWeight = params;
//_______________________________________________________________
        
    if (lastWeight) {
        speechOutput = `Your last weight was ${lastWeight} kilogram. Can I help you with anything else?`;
    } else {
        speechOutput = "You did not input any weight yet. Can I help you with anything else?";
    }
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function diarrhea(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `Do you have problems with diarrhea ${pname}?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
    diarrheaYN = true;
}

function diarrheaProblem(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `After gastric bypass surgery, diarrhea after food intake can most likely be caused by dumping syndrome. Did the problem occur in the first thirty minutes to three hours after your last food intake?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
     yesOrNo = true;    
    
}

function dumpingProblem(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `This might be early dumping, which is mostly caused by large amounts of food that have been eaten too fast and move to quickly undigested from the stomach into the small bowel. When it occurs two-three hours after food intake, it might be late dumping which is mostly caused by high amounts of sugar and a resulting hyper- and then hypoglycemia. Please check your diet and contact your dietitian for a nutrition counselling. If it is not caused by dumping syndrome it might be an infection or can be caused by other reasons from the surgery, in which case you should see your doctor. 
    Can I help you with anything else?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
    yesOrNo = NaN; 
    diarrheaYN = NaN;
    
}

function noDumpingProblem(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `If the problem is not caused by your last food intake this might be an infection or can be caused by other reasons from the surgery, in which case you should see your doctor. 
    Can I help you with anything else?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
    yesOrNo = NaN; 
    diarrheaYN = NaN;
    
}


/*
Für denn fall, dass Intent falsch verstanden wurde: exitTree funktion 

*/

function exitTree(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `Can I help you with anything else?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
    yesOrNo = NaN; 
    diarrheaYN = NaN;
    digProbYN = NaN;
    drinkingRecYN = NaN;
}

/*
Für denn fall, dass Intent falsch verstanden wurde: exitTree funktion 

*/

function requestTree(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  

    speechOutput = `How may I help you?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
    yesOrNo = NaN; 
    diarrheaYN = NaN;
    digProbYN = NaN;
    drinkingRecYN = NaN;
}


/*
drinking recommendations Baum, funktionen für den output, werden unten aufgerufen und mit ihrem intent (drinkingReccomendationsIntent) "verknüpft" --, 

*/

 function  drinkingRec1(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `Do you want to know about your drinking recommendations, ${pname}?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
    
      drinkingRecYN = true;
  
}

 function  drinkingRec2(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `It is important that you at least manage to drink 1.5 Liters a day, if your dietitian didn´t give you an individualized amount of drinking quantity. Recommended are calorie free drinks, especially water and unsweetened tea. Try to drink small sips at a time and have a drinking free period of 30 minutes before and after food intake, especially during the first weeks after surgery. Drinks that contain gas, alcohol or high amounts of sugar shall be avoided, particularly in the first months after surgery. Should I repeat this information for you?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

function noDrinkingRec(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `Howelse can I help you, ${pname}?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
         
  drinkingRecYN = NaN;
  
  
}


/*
allgemeiner digestive problems Baum, werden unten aufgerufen und mit ihrem intent (digestiveProblemsIntent) "verknüpft" --, 

*/

function digestiveProblems(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `Do you have digestive Problems ?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
    
    digProbYN = true
  
}

function yesProblem(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `Have you already eaten today ${pname}?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
    
    yesOrNo = true;   
  
}

function yesEaten(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = ` So you have eaten and have a somache ache now. Try not to eat fast and only small portions next time. Can I help you with anything else?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
    
      yesOrNo= NaN;
      digProbYN = NaN;
  
}

function noEaten(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
  
    
    speechOutput = `Maybe you shouls eat something ${pname}. Can I help you with anything else?`; 

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
    
      yesOrNo= NaN;
      digProbYN = NaN;
  
}
 
// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, 
    
    =${session.userId}`);
    
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, userId=${session.user.userId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, userId=${session.user.userId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'MyNameIs') {
        setNameInSession(intent, session, callback);
    } else if (intentName === 'saveWeightIntent') {
        askForWeight(intent, session, callback);
    } else if (intentName === 'WeightIntent') {
        currentWeight(intent, session, callback);
    } else if (intentName === 'MyNameIs') {
        setNameInSession(intent, session, callback);
    }  else if (intentName === 'WhatsMyNameIntent') {
        getNameFromSession(intent, session, callback);
    } else if (intentName === 'LastWeightIntent') {
        getLastWeight(intent, session, callback);
    } else if  (intentName === 'diarrheaIntent') {
        diarrhea(intent, session, callback);
    }   else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    }else if (intentName === 'diarrheaIntent') {
        diarrhea(intent, session, callback);
    } else if (intentName === 'AMAZON.YesIntent' && diarrheaYN === true && isNaN(yesOrNo)) {
        diarrheaProblem(intent, session, callback);
    } else if (intentName === 'AMAZON.NoIntent' && diarrheaYN === true && isNaN(yesOrNo)) {
        exitTree(intent, session, callback);
    } else if (intentName === 'AMAZON.YesIntent' && diarrheaYN === true && yesOrNo === true) {
       dumpingProblem(intent, session, callback);
    }  else if (intentName === 'AMAZON.NoIntent' && diarrheaYN === true && yesOrNo === true) {
       noDumpingProblem(intent, session, callback);
    }else if (intentName === 'digestiveProblemsIntent') {
        digestiveProblems(intent, session, callback);
    } else if (intentName === 'drinkingRecommendationsIntent') {
        drinkingRec1(intent, session, callback);
    } else if (intentName === 'AMAZON.YesIntent' && drinkingRecYN === true) {
        drinkingRec2(intent, session, callback);
    } else if (intentName === 'AMAZON.NoIntent' && drinkingRecYN === true) {
        noDrinkingRec(intent, session, callback);
    }else if (intentName === 'AMAZON.YesIntent' && digProbYN === true && isNaN(yesOrNo)) {
       yesProblem(intent, session, callback);
    }else if (intentName === 'AMAZON.NoIntent'&& digProbYN === true && isNaN(yesOrNo)) {
        exitTree(intent, session, callback);
    }else if (intentName === 'AMAZON.YesIntent' && digProbYN === true && yesOrNo === true ) {
       yesEaten(intent, session, callback);
    } else if (intentName === 'AMAZON.NoIntent' && digProbYN === true && yesOrNo === true ) {
       noEaten(intent, session, callback);
    }  else if (intentName === 'AMAZON.NoIntent' && isNaN(drinkingRecYN) && isNaN(digProbYN) && isNaN(diarrheaYN) && isNaN(yesOrNo)) {
        handleSessionEndRequest(callback);
    }  else if (intentName === 'AMAZON.YesIntent' && isNaN(drinkingRecYN) && isNaN(digProbYN) && isNaN(diarrheaYN) && isNaN(yesOrNo)) {
       requestTree(intent, session, callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, userId=${session.user.userId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
//checks if app ID is the right skill
//        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[amzn1.ask.skill.2b0d31cf-061e-43dd-ad15-9dbadea61720]') {
//             callback('Invalid Application ID');
//        }
        

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
