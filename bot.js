var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var moment = require('moment');
var fs = require('fs');

moment().format();

var notes = [];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    cleanMsg = message.toLowerCase();

    //Context handling
    if(cleanMsg === "marvin" && !bot.contextActive) {
        bot.contextActive = true;
        bot.commandingUser = userID;
        bot.sendMessage({
            to: channelID,
            message: "Yes?"
        });
    } else if((cleanMsg === "that's all" || cleanMsg === "that is all") && bot.contextActive) {
        bot.contextActive = false;
        bot.sendMessage({
            to: channelID,
            message: "*sigh...*"
        });
    } else if(bot.contextActive) {
        bot.sameChannel = channelID === bot.currentChannel;
        bot.sameUser = userID === bot.commandingUser;
        handleContext(user, userID, channelID, cleanMsg, evt, bot);
    } else {
        //Quick commands
        if (message.substring(0, 1) == '!') {
            var args = message.substring(1).split(' ');
            var cmd = args[0];

            args = args.splice(1);
            switch(cmd) {
                // !ping
                case 'ping':
                    bot.sendMessage({
                        to: channelID,
                        message: 'Pong!'
                    });
                    break;
                // Just add any case commands if you want to..
            }
        }

        //Special messages. Gonna be reworked later
        if(message.toLowerCase() === "hello marvin") {
            bot.sendMessage({
                to: channelID,
                message: '*sigh* hello....'
            });
        }

        if(message.toLowerCase() === "he's pretty stupid" || message.toLowerCase() === "marvin's pretty stupid") {
            bot.sendMessage({
                to: channelID,
                message: "I got a head the size of a planet and I'm tasked with housekeeping for apes... Just power me off now"
            })
        }
    }
});

function handleContext(user, userID, channelID, message, evt, bot) {
    if(userID == bot.id) {
        return;
    }

    if(bot.takingNotes === -1 && bot.sameChannel) {
        saveNotes(message, channelID, bot);
        bot.takingNotes = 0;
    } else if(bot.takingNotes === 1 && bot.sameChannel) {
        if(message === "stop taking notes") {
            bot.takingNotes = -1;
            bot.sendMessage({
                to: channelID,
                message: "What should I name the notes?"
            });
        } else if(bot.sameChannel) {
            notes.push(user + ': ' + message);
        }
    } else {
        if(!bot.sameUser) {
            return;
        }
        switch (message) {
            case "take notes":
                bot.takingNotes = 1;
                bot.currentChannel = channelID;
                bot.sendMessage({
                    to: channelID,
                    message: "Capable of calculating fluid dynamics and you demote me to a typewriter"
                });
                break;
            default:
                bot.sendMessage({
                    to: channelID,
                    message: "*grumbles*"
                });
                break;
        }
    }
}

function saveNotes(name, channelID, bot) {
    if(notes.length > 0) {
        var filename = name.split(' ')[0];
        if(filename.length <= 0) {
            var now = moment();
            filename = now.format('YYYY-MM-DD_HH:MM');
        }
        filename += ".txt";
        var path = "notes/"+filename;

        var file = fs.createWriteStream(path);
        file.on('error', function(err) {
            bot.sendMessage({
                to: channelID,
                message: JSON.stringify(err)
            });
        });

        notes.forEach(function(v) {
            file.write(v + '\r\n');
        });
        file.end();

        bot.sendMessage({
            to: channelID,
            message: "Notes saved."
        });

        notes = [];
    }
}