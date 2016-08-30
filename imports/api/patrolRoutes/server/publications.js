import { Meteor } from 'meteor/meteor'
import { PatrolRoutes } from '../'

Meteor.publish('patrolRoutes', () => {
  return PatrolRoutes.find()
})
