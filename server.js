'use strict';
const admin = require('firebase-admin');
const express = require('express');
const serviceAccount = require('./serviceAccountKey.json');
const axios = require('axios');
const promptsUrl = "https://soapbox-teleprompt.appspot.com/v1/prompts";
const port = process.env.PORT || 3001;
const app = express();

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://soapboxx-dev.firebaseio.com'
});

const Result = class {
    constructor(fetched, added, error, message) {
        this.fetched = fetched;
        this.added = added;
        this.error = error;
        this.message = message;
    }
    toString() {
        return '(' + this.fetched + ', ' + this.added + ', ' + this.error + ', ' + this.message + ')';
    }
};

const getPrompts = function(url, response, error) {
    axios.get(url)
        .then(response)
        .catch(error);
};

const processPrompts = function(prompts, success) {
    let added = 0;
    let promptsRef = firebaseApp.database().ref("teleprompts");
    prompts.map( (item, key) => {
        console.log(item);
        promptsRef.child(item.id).once('value', function(snapshot) {
            console.log(snapshot);
            //if prompt does not exist in database add it
            if (snapshot.val() === null) {
                firebaseApp.database().ref('teleprompts/' + item.id).set({
                    topic: item.topic,
                    id: item.id,
                    text: item.text,
                    approved: item.approved,
                    created_at: item.created_at,
                    source_category: item.source_category
                });
                added++;
            }
            if(key === (prompts.length -1)) {
                success(added);
            }
        });
    });
};

app.get('/', (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    getPrompts(promptsUrl, (remoteResponse)=> {
        processPrompts(remoteResponse.data.prompts, (promptsAdded) => {
            let result = new Result(remoteResponse.data.prompts.length, promptsAdded, false, '');
            response.write(JSON.stringify(result));
            response.end();
        });
    }, (error) => {
        let result = new Result(0, 0, true, 'error: ' + error);
        response.write(JSON.stringify(result));
        response.end();
    })
});

app.listen(port, function () {
    console.log('server listening on port ' + port +'!');
});