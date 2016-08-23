import { Meteor } from 'meteor/meteor';
import { Bots } from '/imports/api/bots'
import { check } from 'meteor/check'
const botInstances = {};
const heartBeats = {};
import Long from 'long'
import PokemonGO from 'pokemon-go-node-api';
import { Detections } from '/imports/api/detections'
import { Pokemons } from '/imports/api/pokemons'
import seedPokemons from '/imports/api/pokemons/seed';
import { PatrolRoutes } from '/imports/api/patrolRoutes'
import seedPatrolRoutes from '/imports/api/patrolRoutes/seed';

import {
  BOT_SPEED_MS,
  BOT_POSITION_UPDATE_PERIOD_S
} from '/imports/config/consts'




Meteor.startup(() => {
  seedPokemons()
  seedPatrolRoutes()
})


const convertLongToString = (object) => Long.fromBits(object.low, object.high, object.unsigned).toString()

Meteor.methods({
  registerBot({username, password, coords}) {
    check(username, String);
    check(password, String);
    check(coords, Object)

    console.log(`Registering new bot: ${username} / ${password} at [ ${coords.latitude}, ${coords.longitude} ]`)

    return Bots.insert({
      username,
      password,
      coords: {
        latitude: parseFloat(coords.latitude),
        longitude: parseFloat(coords.longitude)
      },
      loggedIn: false
    })
  },
  startBotPatrol(botId) {
    const patrolRoute = PatrolRoutes.findOne({
      botId
    })
    const routePlan = patrolRoute.routePlan;
    const botInstance = botInstances[botId]

    Meteor.setInterval(() => {
      const bot = Bots.findOne(botId)
      const { coords: {latitude, longitude} } = bot
      let { currentStep } = bot
      console.log('latitude: ', latitude)
      console.log('longitude: ', longitude)
      console.log('currentStep: ', currentStep)
      if (currentStep > routePlan.length) currentStep = 0;

      const newPosition = routePlan[currentStep]

      console.log('new latitude: ', newPosition.latitude);
      console.log('new longitude: ', newPosition.longitude);

      const newCurrentStep = (currentStep + 1) % routePlan.length;


      botInstance.SetLocation({
        type: 'coords',
        coords: {
          latitude: parseFloat(newPosition.latitude),
          longitude: parseFloat(newPosition.longitude)
        }
      }, Meteor.bindEnvironment((err, coordinates) => {
        if (err) {
          console.log('[Error setLocationOnpatrol] ', err.toString())
        }
        Bots.update({
          _id: botId
        }, {
          $set: {
            currentStep: newCurrentStep,
            coords: {
              latitude: newPosition.latitude,
              longitude: newPosition.longitude
            }
          }
        })

        botInstance.Heartbeat(Meteor.bindEnvironment((err, hb) => {
          if(err) {
            return console.log('[Error at HeartBeat] ', err);
          }
          for (var i = hb.cells.length - 1; i >= 0; i--) {
            const mapPokemon = hb.cells[i].MapPokemon;
            if (mapPokemon && Array.isArray(mapPokemon) && mapPokemon.length) {
              mapPokemon.forEach(pokemon => {
                const pokedexNumber = pokemon.PokedexTypeId;
                const latitude = pokemon.Latitude;
                const longitude = pokemon.Longitude;
                const encounterId  = convertLongToString(pokemon.EncounterId)
                const expirationTimeMs = convertLongToString(pokemon.ExpirationTimeMs)

                const poke = Pokemons.findOne({
                  pokedexNumber
                })
                console.log('[+] There is a ' + poke.name + ' in [ ', latitude , ',', longitude ,']');

                const detection = Detections.findOne({
                  encounterId
                })
                if (!detection) {
                  Detections.insert({
                    pokedexNumber,
                    latitude,
                    longitude,
                    encounterId,
                    expirationTimeMs,
                    botId
                  })
                  console.log('[+] Registering new encounter');
                } else {
                  console.log('[+] This encounter is already registered.');
                }

              })
            }
          }
        }));
      }))



    }, BOT_POSITION_UPDATE_PERIOD_S * 1000)
  },
  printBotLocation(botId) {
    check(botId, String)
    const botInstance = botInstances[botId]
    console.log(botInstance.GetLocationCoords())
  },
  setBotCoordinates(botId, coords) {
    check(botId, String)
    check(coords, Object)

    const bot = Bots.findOne(botId)
    console.log(`Setting bot position for ${bot.username}: [ ${coords.latitude}, ${coords.longitude}]`)

    const botInstance = botInstances[botId];

    botInstance.SetLocation({
      type: 'coords',
      coords: {
        latitude: parseFloat(coords.latitude),
        longitude: parseFloat(coords.longitude)
      }
    }, Meteor.bindEnvironment((err, coordinates) => {
      if (err) {
        console.log('[Error setBotLocation] ', err.toString())
      }
      console.log(coordinates);

      Bots.update({
        _id: botId
      }, {
        $set: {
          coords: {
            latitude: parseFloat(coords.latitude),
            longitude: parseFloat(coords.longitude)
          }
        }
      })
    }))
  },
  getPokemonGoProfile(botId) {
    check(botId, String)

    const bot = Bots.findOne(botId)
    console.log('Fetching bot profile at pokemonGo: ', bot.username)

    const botInstance = botInstances[botId];

    botInstance.GetProfile(Meteor.bindEnvironment((err, profile) => {
      if (err) {
        return console.log('[Error] ', err.toString())
      }

      Bots.update({
        _id: botId
      }, {
        $set: {
          pokemonGO: {
            username: profile.username,
            pokeStorage: profile.poke_storage,
            itemStorage: profile.item_storage
          }
        }
      })
    }))
  },
  startBotHeartbeat(botId) {
    const bot = Bots.findOne(botId)
    console.log('Starting bot heartbeat: ', bot.username)

    check(botId, String)
    const botInstance = botInstances[botId]

    const heartBeatId = Meteor.setInterval(() => {

    }, BOT_POSITION_UPDATE_PERIOD_S * 1000);

    heartBeats[botId] = heartBeatId;

    Bots.update({
      _id: botId
    }, {
      $set: {
        heartBeating: true,
      }
    })
  },
  loginBot(botId) {
    check(botId, String)
    const bot = Bots.findOne(botId);

    console.log('Logging bot to pokemonGo: ', bot.username)

    const botInstance = new PokemonGO.Pokeio();
    botInstances[bot._id] = botInstance;

    const location = {
      type: 'coords',
      coords: {
        latitude: parseFloat(bot.coords.latitude),
        longitude: parseFloat(bot.coords.longitude),
        altitude: 0
      }
    }

    botInstance.init(bot.username, bot.password, location, 'google', Meteor.bindEnvironment((err) => {
      if (err) {
        return console.log('[Error] ', err.toString())
      }

      Bots.update({
        _id: bot._id
      }, {
        $set: {
          loggedIn: true,
        }
      })
    }))
  }
})

Meteor.startup(() => {
  //Set environment variables or replace placeholder text
  var location = {
    type: 'coords',
    coords: {
      latitude: -23.623153,
      longitude: -46.674954
    }
  };
});
