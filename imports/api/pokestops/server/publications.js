import { Meteor } from 'meteor/meteor'
import { Pokestops } from '../'

Meteor.publish('pokestops', () => {
  return Pokestops.find()
})
