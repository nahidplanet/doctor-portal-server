const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');


const app = express();
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.763mi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {

  await client.connect();
  const serviceSlotCollection = client.db('doctor_portal').collection('serviceSlot');

  try {

    app.get('/serviceSlot', async (req, res) => {
      
      const query = {};
      const cursor = serviceSlotCollection.find(query);
      const services = await cursor.toArray();
      res.send(services)
    });





  } finally {
  // client.close()
  }

}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send("doctor portal server")
});
app.listen(port, () => {
  console.log("doctor server Runnig", port);
});




