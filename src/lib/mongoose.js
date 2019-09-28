import mongoose from 'mongoose'
import bluebird from 'bluebird'

const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI : `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}_${process.env.NODE_ENV}`

export const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: true,
  promiseLibrary: bluebird.Promise
}

if(process.env.MONGO_USER) { options.user = process.env.MONGO_USER }
if(process.env.MONGO_PASS) { options.pass = process.env.MONGO_PASS }
if(options.user) { options.auth = { authSource: 'admin' } }
export const connection = mongoose.createConnection(uri, options);