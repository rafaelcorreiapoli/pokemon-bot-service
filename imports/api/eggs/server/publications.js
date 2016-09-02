import { Meteor } from 'meteor/meteor'
import { Eggs } from '../'

Meteor.publish('eggs', ({ botId }) => {
  return Eggs.find({
    botId
  })
})
