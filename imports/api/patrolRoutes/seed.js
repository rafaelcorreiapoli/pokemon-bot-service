import { PatrolRoutes } from './index'
import { calculateRoutePlan } from '/imports/lib/patrol'
import {
  BOT_SPEED_MS,
  BOT_POSITION_UPDATE_PERIOD_S
} from '/imports/config/consts'

export default () => {
  if (PatrolRoutes.find().count() === 0) {
    const points = [
      {
        latitude: -23.634355,
        longitude: -46.714344
      },
      {
        latitude: -23.634300,
        longitude: -46.713886
      },
      {
        latitude: -23.633039,
        longitude: -46.712625
      },
      {
        latitude: -23.632503,
        longitude: -46.713239
      },
    ];

    const routePlan = calculateRoutePlan(points, BOT_SPEED_MS, BOT_POSITION_UPDATE_PERIOD_S)

    const patrolRoute = {
      botId: '3sWoNvDSNsBfYMkFG',
      points,
      routePlan
    }
    PatrolRoutes.insert(patrolRoute)
  }

}
