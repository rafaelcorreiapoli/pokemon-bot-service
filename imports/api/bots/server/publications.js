import { Meteor } from 'meteor/meteor'
import { Bots } from '../'

Meteor.publish('bots', () => {
  return Bots.find()
})
