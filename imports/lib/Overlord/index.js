import Bot from '/imports/lib/Bot'
import { Bots } from '/imports/api/bots'
import { Encounters } from '/imports/api/encounters'
import { Pokestops } from '/imports/api/pokestops'
import { Gyms } from '/imports/api/gyms'

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

  instantiateBot(botId, proxy) {
    const bot = new Bot(botId, proxy)
    this.bots[botId] = bot;
    const botEmail = bot.email
    if (proxy) {
      this.log(`instantiating new bot ${botEmail} with proxy ${proxy}`)
    } else {
      this.log(`instantiating new bot ${botEmail} without proxy`)
    }

    bot.onPokestopFound = ({
      pokestopId,
      latitude,
      longitude
    }) => {
      const pokestop = Pokestops.findOne(pokestopId)
      if (!pokestop) {
        Pokestops.insert({
          _id: pokestopId,
          latitude,
          longitude
        })
      }
    }

    bot.onGymFound = (gym) => {

    }


    bot.onPokemonFound = ( {encounterIdNumber, ...data}) => {
      const encounter = Encounters.findOne(String(encounterIdNumber))
      if (!encounter) {
        Encounters.insert( {
          _id: String(encounterIdNumber),
          ...data
        })
      }
    }
    return bot
  }

  getBot(botId) {
    if (this.bots[botId]) {
      return this.bots[botId]
    } else {
      console.error('Bot instance not found.')
    }
  }
}
