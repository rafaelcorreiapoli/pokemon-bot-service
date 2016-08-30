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
import { itemsById, pokemonsById } from '/imports/resources'

import geolib from 'geolib'

import moment from 'moment'

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

Meteor.startup(() => {
  overlord.recoverBots()
  seedPokemons()
  seedPatrolRoutes()
})


const convertLongToNumber = (object) => Long.fromBits(object.low, object.high, object.unsigned).toNumber()

Meteor.methods({
  registerBot({email, password, routePoints, nickname}) {
    check(email, String)
    check(nickname, String)
    check(password, String)
    check(routePoints, Array)


    const coords = routePoints[0]
    console.log(`Registering new bot: ${email} / ${password} at [ ${coords.latitude}, ${coords.longitude} ]`)
    const botId = Bots.insert({
      coords: {
        latitude: parseFloat(coords.latitude),
        longitude: parseFloat(coords.longitude)
      },
      loggedIn: false,
      status: BOT_STATUS_IDLE,
      email,
      nickname,
      password,
    })

    const routePlan = calculateRoutePlan(routePoints, BOT_SPEED_MS, BOT_POSITION_UPDATE_PERIOD_S)

    return PatrolRoutes.insert({
      botId,
      routePoints,
      routePlan,
    })
  },
  'bots.stopPatrol'({ botId }) {
    const patrolInterval = patrolIntervals[botId]

    if (patrolInterval) {
      Meteor.clearInterval(patrolInterval)
    }
    Bots.update({
      _id: botId
    }, {
      $set: {
        status: BOT_STATUS_IDLE
      }
    })
  },
  'encounters.encounter'({ botId, encounterIdNumber }) {
    check(botId, String)
    check(encounterIdNumber, String)
    const encounter = Encounters.findOne(encounterIdNumber)
    const bot = overlord.getBot(botId)
    bot.encounter(encounterIdNumber, encounter.encounterId, encounter.spawnPointId)
  },
  'encounters.catch'({ botId, encounterIdNumber }) {
    check(botId, String)
    check(encounterIdNumber, String)
    const encounter = Encounters.findOne(encounterIdNumber)
    const bot = overlord.getBot(botId)
    bot.catchPokemon(encounterIdNumber, encounter.encounterId, encounter.spawnPointId)
  },
  'bots.startPatrol'({ botId }) {

  },
  'pokemons.evolve'({ botId }) {
    const botInstance = botInstances[botId]
    const candiesByPokemon = {}

    botInstance.GetInventory(function (err, inventory) {
      if (!err) {
        var cleanedInventory = { player_stats: null, eggs : [], pokemon: [], items: [] };
        for (var i = 0; i < inventory.inventory_delta.inventory_items.length; i++) {
          var inventory_item_data = inventory.inventory_delta.inventory_items[i].inventory_item_data;

          if (inventory_item_data.pokemon_family) {
            const pokemonFamily = inventory_item_data.pokemon_family;
            const pokemonFamilyId = pokemonFamily.family_id;
            const pokemonFamilyCandy = pokemonFamily.candy;
            console.log(pokemonsById[pokemonFamilyId].name + ' - ' +  pokemonFamilyCandy + ' candies')
            candiesByPokemon[pokemonFamilyId] = pokemonFamilyCandy
          }
          // Check for pokemon.
          if (inventory_item_data.pokemon) {
            var pokemon = inventory_item_data.pokemon;
            if (pokemon.is_egg) {
              console.log('  [E] ' + pokemon.egg_km_walked_target + ' Egg');
              cleanedInventory.eggs.push(pokemon);
            } else {
              var pokedexInfo = pokemonsById[pokemon.pokemon_id]
              console.log('  [P] ' + pokedexInfo.name + ' - ' + pokemon.cp + ' CP');
              cleanedInventory.pokemon.push(pokemon);

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
            }
          }

          // Check for player stats.
          if (inventory_item_data.player_stats) {
            var player = inventory_item_data.player_stats;
            console.log('  [PL] Level ' + player.level + ' - ' + player.unique_pokedex_entries + ' Unique Pokemon');

            cleanedInventory.player_stats = player;
          }

          // Check for item.
          if (inventory_item_data.item) {
            var item = inventory_item_data.item;
            console.log('  [I] ' + item.item_id + ' - ' + item.count);

            cleanedInventory.items.push(item);
          }
        }
      }
    });
  },
  'pokestops.get'({ botId, pokestopId }) {
    check(pokestopId, String)
    check(botId, String)
    const pokestop = Pokestops.findOne(pokestopId)
    const bot = overlord.getBot(botId)
    bot.getPokestop(pokestopId, pokestop.latitude, pokestop.longitude)
  },
  'bots.setPosition'({botId, latitude, longitude}) {
    check(botId, String)
    check(latitude, Number)
    check(longitude, Number)

    const bot = overlord.getBot(botId)
    bot.setPosition(latitude, longitude)
    .then(coords => {
      bot.scan()
    })
    .catch(err => {
      throw new Meteor.Error(err)
    })
  },
  'bots.refreshProfile'(botId) {
    check(botId, String)
    const bot = overlord.getBot(botId)
    bot.refreshProfile()
  },
  'bots.login'({ botId }) {
    check(botId, String)
    const bot = overlord.getBot(botId)
    bot.login()
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
