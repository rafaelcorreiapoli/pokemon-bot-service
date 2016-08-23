import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

import { Bots } from '/imports/api/bots'
import { Detections } from '/imports/api/detections'
import { Pokemons } from '/imports/api/pokemons'
import { PatrolRoutes } from '/imports/api/patrolRoutes'

const botId = '3sWoNvDSNsBfYMkFG';

Template.panel.events({
  'click #login'() {
    Meteor.call('loginBot', botId)
  },
  'click #start-heartbeat'() {
    Meteor.call('startBotHeartbeat', botId)
  },
  'click #set-position'() {
    const latitude = $('#latitude').val()
    const longitude = $('#longitude').val()

    console.log(latitude, longitude);

    Meteor.call('setBotCoordinates', '3sWoNvDSNsBfYMkFG', {
      latitude,
      longitude
    })
  },
  'click #get-position'() {
    Meteor.call('printBotLocation', botId)
  },

})
