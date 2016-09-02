import { Mongo } from 'meteor/mongo'

export const Eggs = new Mongo.Collection('eggs')

Meteor.startup(() => {
  Eggs.remove({}, {
    $multi: true
  })
})
