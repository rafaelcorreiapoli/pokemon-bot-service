import { Meteor } from 'meteor/meteor'
import { Bots } from '../'

Meteor.publish('bots', () => {
  return Bots.find()
})

Meteor.publish('bots.profile', ({ botId }) => {
  return Bots.find({
    _id: botId
  })
})
