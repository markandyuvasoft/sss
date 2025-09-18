const mongoose = require("mongoose");
// testd
const connectDB = async () => {
  try {
    // const MONGO_USER = process.env.MONGO_USER;
    // const MONGO_PASS = process.env.MONGO_PASS;
    // const MONGO_HOST = process.env.MONGO_HOST;
    // const MONGO_URI = `mongodb+srv://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}/test?retryWrites=true&w=majority`;

    // await mongoose.connect(process.env.MONGO_URI, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });
    // await mongoose.connect(process.env.MONGO_URI); // No need for deprecated options

    console.log("MongoDB Connected...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'gopratle',
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
