import geolib from 'geolib'

export const nextPositionByRoutePlan = (step, latitude, longitude, routePlan) => {
  let accStep = 0;
  let newLatitude = latitude;
  let newLongitude = longitude;

  routePlan.every((command, i) => {
    if (step >= accStep && step < accStep + command.necessarySteps) {
      newLatitude = latitude + command.dLatitude;
      newLongitude = longitude + command.dLongitude;

      return false;
    }
    accStep = accStep + command.necessarySteps;
    return true;
  })

  return {
    latitude: newLatitude,
    longitude: newLongitude
  }
}

export const calculateRoutePlan = (points, velMetersSecond, updatePeriodSeconds) => {
  const routePlan = [];
  const nPoints = points.length;

  const routePlanPoints = []
  points.forEach((point, i) => {
    const nextPoint = points[(i + 1) % nPoints];


    const deltaLongitude = nextPoint.longitude - point.longitude
    const deltaLatitude = nextPoint.latitude - point.latitude
    const distance = geolib.getDistance(point, nextPoint);
    const metersPerStep = velMetersSecond * updatePeriodSeconds;
    const necessarySteps = Math.ceil(distance / metersPerStep);
    const dLongitude = deltaLongitude / necessarySteps
    const dLatitude = deltaLatitude / necessarySteps

    for (let i = 0; i < necessarySteps; i++) {
      routePlanPoints.push({
        latitude: point.latitude + dLatitude * i,
        longitude: point.longitude + dLongitude * i
      })
    }
  })
  console.log(routePlanPoints)
  return routePlanPoints
}
