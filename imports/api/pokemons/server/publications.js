import { Meteor } from 'meteor/meteor'
import { Pokemons } from '../'

Meteor.publish('pokemons', ({ botId }) => {
  console.log('publishing pokemons')
  return Pokemons.find()
})
