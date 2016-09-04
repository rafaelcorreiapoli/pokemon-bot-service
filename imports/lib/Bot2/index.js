import geolib from 'geolib'
import moment from 'moment'
import PokemonGO from 'pokemon-go-node-api';
import { Bots } from '/imports/api/bots'
import { convertLongToString, convertLongToNumber } from '/imports/lib/utils/long'
import { itemsById, pokemonsById } from '/imports/resources'
import { Random } from 'meteor/random'

const CATCH_STATUS = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];

const LOGGED_OUT = 0
const LOGGING_IN = 1;
const LOGGED_IN = 2;
const AUTO_SCAN_INTERVAL = 60000;

export default class Bot {
  constructor({ email, password, coords, proxy = ''}) {
    this.api = new PokemonGO.Pokeio(proxy);
    this.api.playerInfo.debug = false;
    this.printLog = true
    this.email = email
    this.password = password
    this.proxy = proxy
    this.coords = coords
  }
  log(what) {
    if (this.printLog) {
      console.log(`[+] ${this.email}: ${what}`)
    }
  }
  logError(what) {
    if (this.printLog) {
      console.error(`[x] ${this.email}: ${what}`)
    }
  }

  _buildLocation(latitude, longitude) {
    return {
      type: 'coords',
      coords: {
        latitude,
        longitude,
        altitude: 0
      }
    }
  }

  _handleBotError(error) {
    this.logError(`${error.toString()}`)

    Bots.update(this.botId, {
      $set: {
        loginStatus: LOGGED_OUT,
        error
      }
    })
  }

  _extractCurrency(currency) {
    let pokecoin = 0
    let stardust = 0
    currency.forEach(cur => {
      switch (cur.type) {
        case 'POKECOIN':
        pokecoin = cur.amount
        break;
        case 'STARDUST':
        stardust = cur.amount
        break;
      }
    })

    return {
      pokecoin,
      stardust
    }
  }

  _buildCatchablePokemon(encounterId, spawnPointId) {
    return {
      EncounterId: encounterId,
      SpawnPointId: spawnPointId
    }
  }


  _getDistanceFromBot(latitude, longitude) {
    //  TODO: Make bot.coords always up to date
    const botLatitude = bot.coords.latitude;
    const botLongitude = bot.coords.longitude;
    return geolib.getDistance({
      latitude: botLatitude,
      longitude: botLongitude
    }, {
      latitude,
      longitude
    })
  }

  encounter(encounterId, spawnPointId, cb) {
    const catchablePokemon = this._buildCatchablePokemon(encounterId, spawnPointId)
    this.api.EncounterPokemon(catchablePokemon, Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      console.log(error)
      console.log(res)
      if (res) {
        const encounterStatus = res.EncounterStatus
        this.log(`encountered pokemon. encounter status: ${encounterStatus}.`)
        cb(null, {
          encounterStatus: res.EncounterStatus,
          cp: res.WildPokemon && res.WildPokemon.pokemon.cp
        })
      }
    }));
  }

  catchPokemon(encounterId, spawnPointId, cb) {
    const catchablePokemon = this._buildCatchablePokemon(encounterId, spawnPointId)
    this.api.CatchPokemon(catchablePokemon, 1, 1.950, 1, 1, Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }

      if (res) {
        const status = res.Status || 0
        this.log(`[+] catch result: ${CATCH_STATUS[status]}`);
        cb(null, status)
      }
    }));
  }

  fetchInventory(cb) {
    this.log(`fetching inventory`)
    this.api.GetInventory(Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }

      this.log(`fetch inventory success`)
      let level
      let uniquePokedex
      let eggs = []
      let pokemons = []
      let items = []
      let candies = []
      const inventoryItems = res.inventory_delta.inventory_items
      inventoryItems.forEach(item => {
        const inventoryItemData = item.inventory_item_data;

        // Candies
        if (inventoryItemData.pokemon_family) {
          const pokemonFamily = inventoryItemData.pokemon_family;
          const pokemonFamilyId = pokemonFamily.family_id;
          const pokemonFamilyCandy = pokemonFamily.candy;

          candies.push({
            pokedexNumber: pokemonFamilyId,
            count: pokemonFamilyCandy
          })
        }

        // Check for pokemon.
        if (inventoryItemData.pokemon) {
          const pokemon = inventoryItemData.pokemon;
          pokemon.idNumber = convertLongToString(pokemon.id)
          if (pokemon.is_egg) {
            eggs.push({
              eggIdNumber: pokemon.idNumber,
              eggId: pokemon.id,
              walkedTarget: pokemon.egg_km_walked_target,
              walkedStart: pokemon.egg_km_walked_start
            });
          } else {
            pokemons.push({
              pokemonIdNumber: pokemon.idNumber,
              pokemonId: pokemon.id,
              pokedexId: pokemon.pokemon_id,
              cp: pokemon.cp,
              stamina: pokemon.stamina,
              staminaMax: pokemon.staminaMax,
              height: pokemon.height_m,
              weight: pokemon.weight_m,
              attack: pokemon.individual_attack,
              defense: pokemon.individual_defense,
              moves: [pokemon.move_1, pokemon.move_2]
            });
          }
        }

        // Check for player stats.
        if (inventoryItemData.player_stats) {
          const player = inventoryItemData.player_stats;
          level = player.level;
          uniquePokedex = player.unique_pokedex_entries
        }

        // Check for item.
        if (inventoryItemData.item) {
          const item = inventoryItemData.item;
          items.push({
            itemId: item.item_id,
            count: item.count
          });
        }
      })

      cb(null, {
        level,
        uniquePokedex,
        items,
        candies,
        eggs,
        pokemons
      })
    }));
  }


  evolvePokemon(pokemonId, cb) {
    this.log(`evolving pokemon ${pokemonId}`)
    this.api.EvolvePokemon(pokemonId, Meteor.bindEnvironment((err, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      this.log(`evolve pokemon success`)
      cb(null, res)
    }))
  }

  dropItem(itemId, count, cb) {
    this.log(`dropping ${itemId} (${count})`)
    this.api.DropItem(itemId, count, Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      this.log(`successfully dropped item(s)`)
      cb(null, res)
    }))
  }

  transferPokemon(pokemonId, cb) {
    this.log(`transfering ${pokemonId}`)
    this.api.TransferPokemon(pokemonId, Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      this.log(`successfuly transfered pokemon`)
      cb(null, res)
    }))
  }


  getPokestop(pokestopId, latitude, longitude, cb) {
    this.api.GetFort(pokestopId, latitude, longitude, Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      if (res) {
        let itemsAwarded = []
        if (res.result === 1) {
          this.log(`success getting pokestop`)
          this.log(`items acquired:`)
          itemsAwarded = res.items_awarded.map(item => {
            this.log(`  ${itemsById[item.item_id]}`)
            return item.item_id
          })
        } else if (res.result === 2 ) {
          this.log('pokestop is out of range.')
        } else if (res.result === 3 ) {
          this.log('pokestop is used')
        }

        cb(null, {
          result: res.result,
          itemsAwarded
        })
      }
    }));
  }

  setPosition(latitude, longitude, cb) {
    this.log(`settings position: ${latitude}, ${longitude}`)
    const location = this._buildLocation(latitude, longitude)

      this.api.SetLocation(location, Meteor.bindEnvironment((error, coords) => {
        if (error) {
          this._handleBotError(error)
          cb(error)
          return;
        }
        cb(null, coords)
      }))
  }

  fetchProfile(cb) {
    this.log(`refreshing profile`)

    this.api.GetProfile(Meteor.bindEnvironment((error, profile) => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }
      const { team, username, avatar, poke_storage, item_storage, currency } = profile
      const { pokecoin, stardust } = this._extractCurrency(currency)

      this.log(`successfully fetched profile`)
      cb(null, {
        'pokeStorage': poke_storage,
        'itemStorage': item_storage,
        'team': team,
        'username': username,
        'avatar': avatar,
        'pokecoin': pokecoin,
        'stardust': stardust,
      })
    }))
  }

  login(cb) {
    this.log(`logging in`)
    const location = this._buildLocation(this.coords.latitude, this.coords.longitude)

    this.api.init(this.email, this.password, location, 'google', Meteor.bindEnvironment(error => {
      if (error) {
        this._handleBotError(error)
        cb(error)
        return;
      }

      this.log(`successfully logged in`)
      const token = Random.id()
      cb(null, token)
    }))
  }

  startSmartScan() {

  }


  scan(callback) {
    // if (this.scanAgainTimer) {
    //   Meteor.clearTimeout(this.scanAgainTimer)
    // }
    // this.scanAgainTimer = Meteor.setTimeout(() => {
    //   this.scan()
    // }, AUTO_SCAN_INTERVAL)

    const encounters = []
    const gyms = []
    const pokestops = []
    this.log(`scanning area. auto scan in ${AUTO_SCAN_INTERVAL / 1000} secs`)

    this.api.Heartbeat(Meteor.bindEnvironment((error, res) => {
      if (error) {
        this._handleBotError(error)
        callback(error)
        return;
      }

      for (let i = res.cells.length - 1; i >= 0; i--) {
        const mapPokemon = res.cells[i].MapPokemon || [];
        const forts = res.cells[i].Fort || []
        forts.forEach(fort => {
          const latitude = fort.Latitude
          const longitude = fort.Longitude
          //const distance = this._getDistanceFromBot(latitude, longitude)

          if (fort.FortType === 1) {
            // Pokestops
            //this.log(`scanned a pokestop ${distance} meters away`)
            pokestops.push({
              pokestopId: fort.FortId,
              latitude,
              longitude
            })
          } else if (fort.FortType === 0) {
            // Gyms
            //this.log(`scanned a gym ${distance} meters away`)
            gyms.push({
              gymId: fort.FortId,
              latitude,
              longitude
            })
          }
        })

        mapPokemon.forEach(pokemon => {
          const pokedexNumber = pokemon.PokedexTypeId;
          const latitude = pokemon.Latitude;
          const longitude = pokemon.Longitude;
          const spawnPointId = pokemon.SpawnPointId
          const encounterId  = pokemon.EncounterId
          const encounterIdNumber = convertLongToString(pokemon.EncounterId)
          const expirationTimeMs = convertLongToNumber(pokemon.ExpirationTimeMs)
          const pokedexInfo = pokemonsById[pokedexNumber]
          //const distance = this._getDistanceFromBot(latitude, longitude)

          this.log(`scanned a pokemon ${pokedexInfo.name}`)
          encounters.push({
            botId: this.botId,
            expirationDate: moment(expirationTimeMs).toDate(),
            pokedexNumber,
            latitude,
            longitude,
            spawnPointId,
            encounterId,
            encounterIdNumber,
            expirationTimeMs,
          })
        })
      }

      callback(null, {
        pokestops,
        gyms,
        encounters
      })
    }));
  }
}
