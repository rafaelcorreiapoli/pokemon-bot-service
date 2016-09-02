import { Meteor } from 'meteor/meteor';
import { Bots } from '/imports/api/bots'
import { check } from 'meteor/check'

import Overlord from '/imports/lib/Overlord'

const botInstances = {};
const heartBeats = {};
const patrolIntervals = {};
import Long from 'long'
import PokemonGO from 'pokemon-go-node-api';
import { Encounters } from '/imports/api/encounters'
import { Pokemons } from '/imports/api/pokemons'
import { Pokestops } from '/imports/api/pokestops'

import seedPokemons from '/imports/api/pokemons/seed';
import { PatrolRoutes } from '/imports/api/patrolRoutes'
import seedPatrolRoutes from '/imports/api/patrolRoutes/seed';
import { calculateRoutePlan } from '/imports/lib/patrol'
import '/imports/api/bots/server/publications'
import '/imports/api/encounters/server/publications'
import '/imports/api/patrolRoutes/server/publications'
import '/imports/api/pokestops/server/publications'
import '/imports/api/pokemons/server/publications'
import '/imports/api/eggs/server/publications'
import { itemsById, pokemonsById } from '/imports/resources'
import geolib from 'geolib'
import moment from 'moment'

import Bot2 from '/imports/lib/Bot2'
import Overlord2 from '/imports/lib/Overlord2'

const CATCH_STATUS = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
import {
  BOT_SPEED_MS,
  BOT_POSITION_UPDATE_PERIOD_S
} from '/imports/config/consts'

const BOT_STATUS_IDLE = 0;
const BOT_STATUS_LOGGING_IN = 1;
const BOT_STATUS_LOGGED_IN = 2;
const BOT_STATUS_PATROLLING = 3;
const BOT_STATUS_ERROR = 4;

const overlord = new Overlord();
const overlord2 = new Overlord2();

Meteor.startup(() => {
  overlord.recoverBots()
})


const convertLongToNumber = (object) => Long.fromBits(object.low, object.high, object.unsigned).toNumber()

Meteor.methods({
  'encounterPokemon'({ token, encounterId, spawnPointId }) {
    check(token, String)
    check(encounterId, String)
    check(spawnPointId, String)
    const bot = overlord.getBotSync(token)
    try {
      return bot.encounter(encounterIdNumber, encounterId, spawnPointId)
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'catchPokemon'({ token, encounterId, spawnPointId }) {
    check(token, String)
    check(encounterId, String)
    check(spawnPointId, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.catchPokemon(encounterId, spawnPointId)
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'fetchInventory'({ token }) {
    check (token, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.fetchInventory()
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'evolvePokemon'({ token, pokemonId }) {
    check (token, String)
    check (pokemonId, String)

    const bot = overlord.getBotSync(token)
    try {
      return bot.evolvePokemon(pokemonId)
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'dropItem'({ token, itemId, count }) {
    check(token, String)
    check(itemId, Number)
    check(counter, Number)
    const bot = overlord.getBotSync(token)
    try {
      return bot.dropItem(itemId, counter)
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'transferPokemon'({ token, pokemonId }) {
    check(token, String)
    check(pokemonId, String)
    const bot = overlord.getSyncBot(token)

    try {
      return bot.transferPokemon(pokemonId)
    } catch (error) {
      throw new Meteor.Error(error)
    }
  },
  'getPokestop'({ token, pokestopId, latitude, longitude }) {
    check(token, String)
    check(pokestopId, String)
    check(latitude, Number)
    check(longitude, Number)

    const bot = overlord.getSyncBot(token)

    try {
      return bot.getPokestop(pokestopId, lLatitude, lLongitude)
    } catch (error) {
      throw new Meteor.Error(error)
    }

  },
  'setPosition'({token, latitude, longitude}) {
    check(token, String)
    check(latitude, Number)
    check(longitude, Number)

    const bot = overlord.getSyncBot(token)
    try {
      const coords = bot.setPosition(latitude, longitude)
    } catch (error) {
      throw new Meteor.Error(err)
    }
  },
  'fetchProfile'({ token }) {
    check(token, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.fetchProfile()
    } catch (error) {
      console.log(error)
      throw new Meteor.Error(error)
    }
  },
  'login'({ email, password, coords }) {
    check(email, String)
    check(password, String)
    check(coords, Object)
    const bot = new Bot2({ email, password, coords })
    const syncLogin = Meteor.wrapAsync(bot.login, bot)
    try {
      const token = syncLogin()
      overlord2.registerBot(token, bot)
      return token
    } catch (err) {
      console.log(err)
      throw new Meteor.Error(err)
    }
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


/*
if (candiesByPokemon[pokemon.pokemon_id] >= pokedexInfo.candy && pokedexInfo.candy) {
  candiesByPokemon[pokemon.pokemon_id] = candiesByPokemon[pokemon.pokemon_id] - pokedexInfo.candy
  console.log('SHOULD EVOLVE ' + pokedexInfo.name + ' (' + pokemon.id + ')')
  botInstance.EvolvePokemon(pokemon.id.toString(), (err, res) => {
    if (err) {
      console.error(err)
    } else {
      console.log(res)
    }
  })
}
*/
/*
console.log('start patrol');
const patrolRoute = PatrolRoutes.findOne({
  botId
})
const routePlan = patrolRoute.routePlan;
const botInstance = botInstances[botId]

Bots.update({
  _id: botId
}, {
  $set: {
    status: BOT_STATUS_PATROLLING
  }
})

patrolIntervals[botId] = Meteor.setInterval(() => {
  const bot = Bots.findOne(botId)
  const { coords: {latitude, longitude} } = bot
  let { currentStep = 0} = bot
  console.log('latitude: ', latitude)
  console.log('longitude: ', longitude)
  console.log('currentStep: ', currentStep)
  if (currentStep > routePlan.length) currentStep = 0;

  const newPosition = routePlan[currentStep]

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
      Bots.update({
        _id: botId
      }, {
        $set: {
          status: BOT_STATUS_ERROR
        }
      })
      Meteor.clearInterval(patrolIntervals[botId])
      delete patrolIntervals[botId]
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
            const spawnPointId = pokemon.SpawnPointId
            const encounterId  = convertLongToNumber(pokemon.EncounterId)
            const expirationTimeMs = convertLongToNumber(pokemon.ExpirationTimeMs)

            const poke = Pokemons.findOne({
              pokedexNumber
            })

            console.log('[+] There is a ' + poke.name + ' in [ ', latitude , ',', longitude ,']');

            const detection = Encounters.findOne({
              encounterId
            })
            if (!detection) {
              Encounters.insert({
                pokedexNumber,
                latitude,
                longitude,
                encounterId,
                expirationTimeMs,
                botId,
                spawnPointId,
                long: {
                  encounterId: pokemon.EncounterId,
                  spawnPointId: pokemon.SpawnPointId
                },
                expirationDate: moment(expirationTimeMs).toDate(),

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
*/
