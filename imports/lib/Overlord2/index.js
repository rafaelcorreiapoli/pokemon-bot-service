import Bot from '/imports/lib/Bot'
import { Bots } from '/imports/api/bots'
import { Encounters } from '/imports/api/encounters'
import { Pokestops } from '/imports/api/pokestops'
import { Eggs } from '/imports/api/eggs'
import { Pokemons } from '/imports/api/pokemons'
import { Gyms } from '/imports/api/gyms'
import { Async } from 'meteor/meteorhacks:async'
export default class Overlord {
  constructor() {
    this.bots = {}
    this.printLog = true;
    this.printErrors = true;
  }
  recoverBots() {
    Bots.find().forEach(bot => {
      const botInstance = this.instantiateBot(bot._id)

      if (bot.loginStatus === 2) {
        botInstance.login()
      }
    })
  }

  log(what) {
    if (this.printLog) {
      console.log(`[o] ${what}`)
    }
  }

  logError(what) {
    if (this.printErrors) {
      console.error(`[x] ${what}`)
    }
  }

  registerBot(token, botInstance) {
    this.bots[token] = botInstance
  }
  getSyncBot(token) {
    if (this.bots[token]) {
      return Async.wrap(this.bots[token], [
        'refreshProfile',
        'setPosition',
        'scan',
        'catchPokemon',
        'transferPokemon',
        'getPokestop',
        'dropItem',
        'fetchInventory',
        'evolvePokemon',
      ]);
    } else {
      throw new Error('invalid token.')
    }
  }
  getBot(token) {
    if (this.bots[token]) {
      return this.bots[token]
    } else {
      throw new Error('invalid token.')
    }
  }
}
