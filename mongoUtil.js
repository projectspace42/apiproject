const {MongoClient} = require('mongodb');

async function connect(mongoURL, databaseName) {
    const client = await MongoClient.connect(process.env.MONGO_URL);

    // same as switching the database
    const db = client.db(databaseName);
    return db;
}

module.exports = {
    connect
};