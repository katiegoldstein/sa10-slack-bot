import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import botkit from 'botkit';
import yelp from 'yelp-fusion';

// worked on pseudoCODE with @charlottechui my babe

dotenv.config({ silent: true });

// initialize
const app = express();

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// additional init stuff should go before hitting the routing

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// random direct message
controller.on('direct_mention', (bot, message) => {
  bot.reply(message, 'HI ur yelling. Mo00om I am an adult bot now');
});

// random dm
controller.on('direct_message', (bot, message) => {
  bot.reply(message, 'mmm sliding into those DMs huh');
});

// rando webhook
controller.on('outgoing_webhook', (bot, message) => {
  bot.reply(message, 'Mwah hello.');
});

// example hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Howdy there, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Heeeellooooo!');
    }
  });
});

// another random message
controller.hears(['wassup', 'how are you', 'what is up'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `I'm hungry, ${res.user.name}! Are you? Say hungry`);
    } else {
      bot.reply(message, 'Tell me you are hungry!!');
    }
  });
});

// help message
controller.hears('help', ['direct_mention', 'direct_message'], (bot, message) => {
  bot.reply(message, 'If you type hungry, I will give you food recommendations!!!!! Wooooot');
});

// Yelp Integration
const yelpClient = yelp.client(process.env.YELP_API_KEY);

controller.hears(['food', 'hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.startConversation(message, (err, convo) => {
        let location = '';
        let foodChoice = '';

        convo.addQuestion(`Lol Im just a tweenager but I got u sis ${res.user.name}. Where u at??? ex like Hanover, NH`, (response, nextLine) => {
          location = response.text;
          nextLine.next();
        }, { key: 'location' }, 'default');

        convo.addQuestion(`Ok got u bro ${res.user.name}. Now what would you do for a Klondike bar?? JK tell me what food type you want I'm bored. ex Sushi`, (response, nextLine) => {
          foodChoice = response.text;

          if (location.length > 0 && foodChoice.length > 0) {
            yelpClient.search({
              term: foodChoice,
              location,
            }).then((res) => {
              convo.say(`Yayyyyyy found some food like this ${foodChoice}: ${res.jsonBody.businesses[0].name}`);

              convo.say(`THis place has like ${res.jsonBody.businesses[0].review_count} reviews on Yelp. Avg rating isssss ${res.jsonBody.businesses[0].rating}. Call ${res.jsonBody.businesses[0].phone} to order ur food now hehe!`);

              const attachments = {
                attachments: [
                  {
                    fallback: 'Yikes whaaaat!',
                    title: res.jsonBody.businesses[0].name,
                    text: res.jsonBody.businesses[0].url,
                    color: '#ff0000',
                    thumb_url: res.jsonBody.businesses[0].image_url,
                  },
                ],
              };

              convo.say(attachments);
            }).catch((e) => {
              console.log(e);
            });
          }

          nextLine.next();
        }, { key: 'food' }, 'default');

        convo.addMessage('Oops sry I am WORKINGGGG lo siento', 'default');
      });
    } else {
      bot.reply(message, 'Lol rip re do this plsszzzz!');
    }
  });
});

// if they say anything else that isn't predefined
controller.hears('^[A-z]+$', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Lol hiiiii I do nawwt understand u rn so just come again??');
});


// wake my bot UPpppp
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'Hiiiiiii u rang??');
});


// commenting out the server!
// START THE SERVER
// // =============================================================================
// const port = process.env.PORT || 9090;
// app.listen(port);

// console.log(`listening on: ${port}`);
