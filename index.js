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
  const bookingCollection = client.db('doctor_portal').collection('booking');
  const userCollection = client.db('doctor_portal').collection('user');

  try {
    // ACCESS_TOKEN and User 

    app.put('/user/:email', async (req,res)=>{
      const email = req.params.email;
      const user = req.body;
      
      const filter = {email:email}
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      
      var token =  jwt.sign(user,process.env.ACCESS_TOKEN,{
        expiresIn:"1h"
      } );
      res.send({result,token})
    })

    // Time Slote of Appointment 
    app.get('/avilable', async (req, res) => {
      const date = req.query.date ;
      const services = await serviceSlotCollection.find().toArray();
      const query = { date: date }
      const bookings = await bookingCollection.find(query).toArray();

      services.forEach(service => {
        const serviceBookings = bookings.filter(book => book.serviceName === service.name);
        const bookedSlots = serviceBookings.map(book => book.slot);
        const avilable = service.slots.filter(slot => !bookedSlots.includes(slot));
        service.slots = avilable;


      });

      res.send(services);
    });

    // Service SLot time 
    app.get('/serviceSlot', async (req, res) => {

      const query = {};
      const cursor = serviceSlotCollection.find(query);
      const services = await cursor.toArray();
      res.send(services)
    });

    // My APPointment 
    app.post('/myappointment', async (req, res) => {
      const email = req.query.patient;
      const query = { email: email }
      const myAppointment =await bookingCollection.find(query).toArray();

      res.send(myAppointment);
    })

    // BOOKING SERVICE SLOT 
    app.post('/booking', async (req, res) => {
      const addBooking = req.body;
      const query = { serviceName: addBooking.serviceName, slot: addBooking.slot, email: addBooking.email ,date:addBooking.date };
      const exist = await bookingCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, booking: exist });
      }
      const result = await bookingCollection.insertOne(addBooking);
      res.send({ success: true, result })
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




// ACCESS_TOKEN