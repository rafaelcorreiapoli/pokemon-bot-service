import Long from 'long'
export const convertLongToString = (object) => Long.fromBits(object.low, object.high, object.unsigned).toString()
export const convertLongToNumber = (object) => Long.fromBits(object.low, object.high, object.unsigned).toNumber()
