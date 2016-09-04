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

const overlord = new Overlord2();

Meteor.startup(() => {
  //overlord.recoverBots()
})


const convertLongToNumber = (object) => Long.fromBits(object.low, object.high, object.unsigned).toNumber()

Meteor.methods({
  'encounterPokemon'({ token, encounterId, spawnPointId }) {
    check(token, String)
    check(encounterId, Object)
    check(spawnPointId, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.encounter(encounterId, spawnPointId)
    } catch (error) {
      throw new Meteor.Error(error.reason)
    }
  },
  'catchPokemon'({ token, encounterId, spawnPointId }) {
    check(token, String)
    check(encounterId, Object)
    check(spawnPointId, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.catchPokemon(encounterId, spawnPointId)
    } catch (error) {
      throw new Meteor.Error(error.reason)
    }
  },
  'fetchInventory'({ token }) {
    check (token, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.fetchInventory()
    } catch (error) {
      throw new Meteor.Error(error.reason)
    }
  },
  'evolvePokemon'({ token, pokemonId }) {
    check (token, String)
    check (pokemonId, String)

    const bot = overlord.getBotSync(token)
    try {
      return bot.evolvePokemon(pokemonId)
    } catch (error) {
      throw new Meteor.Error(error.reason)
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
      throw new Meteor.Error(error.reason)
    }
  },
  'transferPokemon'({ token, pokemonId }) {
    check(token, String)
    check(pokemonId, String)
    const bot = overlord.getSyncBot(token)

    try {
      return bot.transferPokemon(pokemonId)
    } catch (error) {
      throw new Meteor.Error(error.reason)
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
      throw new Meteor.Error(error.reason)
    }

  },
  'setPosition'({token, latitude, longitude}) {
    check(token, String)
    check(latitude, Number)
    check(longitude, Number)

    const bot = overlord.getSyncBot(token)
    try {
      const coords = bot.setPosition(latitude, longitude)
      const scan = bot.scan()
      return scan;
    } catch (error) {
      throw new Meteor.Error(error.reason)
    }
  },
  'fetchProfile'({ token }) {
    check(token, String)
    const bot = overlord.getSyncBot(token)
    try {
      return bot.fetchProfile()
    } catch (error) {
      throw new Meteor.Error(error.reason)
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
      overlord.registerBot(token, bot)
      return token
    } catch (err) {
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
