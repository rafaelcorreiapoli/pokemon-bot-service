import { Meteor } from 'meteor/meteor'
import { Encounters } from '../'

Meteor.publish('encounters', () => {
  return Encounters.find({
    expirationDate: {
      $gte: new Date()
    }
  })
})
