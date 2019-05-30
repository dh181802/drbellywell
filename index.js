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
const uuid = require('uuid');
const iotData = new AWS.IotData({ endpoint: "us-east-1:609746199304" });
//for persistent attributes
//const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
//const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ tableName : 'healthdata' })

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
        ptime = Date();
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

/*
diarrhea funktion für den output, wird unten aufgerufen und mit ihrem intent (diarrhiaIntent) "verknüpft"
*/
function diarrhea(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
    let yesOrNo;

    speechOutput = `Diarrhea, also spelled diarrhoea, is 
    the condition of having at least three loose, liquid, or watery bowel movements each day. It often lasts for a few days and can 
    result in dehydration due to fluid loss. Signs of dehydration often begin with loss of the normal stretchiness of the skin and irritable behaviour. `; 
    

    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

//user can ask for the last weight input
function getLastWeight(intent, session, callback) {
    let lastWeight;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        lastWeight = session.attributes.weightValue;
    }

    if (lastWeight) {
        speechOutput = `Your last weight was ${lastWeight}.`;
        shouldEndSession = false;
    } else {
        speechOutput = "You did not input any weight yet.";
    }
    
    
    
    
    
    
    
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
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
