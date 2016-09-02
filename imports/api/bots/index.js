import { Mongo } from 'meteor/mongo'

export const Bots = new Mongo.Collection('bots')
Meteor.startup(() => {
  Bots.update({}, {
    $set: {
      status: 0,
      pokemonGoProfile: {}
    }
  }, {
    multi: true

  })
})
