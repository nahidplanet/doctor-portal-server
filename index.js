const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.763mi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {

  await client.connect();
  const serviceSlotCollection = client.db('doctor_portal').collection('serviceSlot');
  const bookingCollection = client.db('doctor_portal').collection('booking');
  const userCollection = client.db('doctor_portal').collection('user');
  const doctorCollection = client.db('doctor_portal').collection('doctor');


  function verifyJWT(req, res, next) {
    const authHeader = req.headers.athorizetion;

    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;

      next();
    });
  }
  // =========================================================
  
// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: "bar@example.com, baz@example.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error);



  try {
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const cursor = await userCollection.findOne(query);
      const isAdmin = cursor.role === "admin";
      if (isAdmin) {
        next();
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    }


    // delete doctor 
    app.delete('/doctorDelete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await doctorCollection.deleteOne(query);
      res.send(result);
    });



    // Update Doctor 
    app.put('/updateDoctor/:id', async (req, res) => {
      const id = req.params.id;
      const updateDoctor = req.body;
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: updateDoctor
      };
      const result = await doctorCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // Manage Doctor 
    app.get('/manageDoctor', async (req, res) => {
      const result = await doctorCollection.find({}).toArray();
      res.send(result);
    });



    // add speciality 
    app.get('/adddoctor', async (req, res) => {
      const query = {};
      const specialites = await serviceSlotCollection.find(query).project({ name: 1 }).toArray();
      res.send(specialites);
    })
    app.post('/addnewdoctor', async (req, res) => {
      const doctor = req.body;
      const result = doctorCollection.insertOne(doctor);
      res.send({ success: true, result });
    })



    // check is add admin useAdmin hooks 
    app.get('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await userCollection.findOne(query);
      const isAdmin = cursor.role === "admin";
      res.send({ admin: isAdmin });
    })



    // meke Admin 
    app.put('/user/admin', verifyJWT, verifyAdmin, async (req, res) => {
      const admin = req.query.admin;
      const query = { email: admin };
      const updateDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });



    // Get User 
    app.get('/users', verifyJWT, async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);

    })

    // My APPointment 
    app.get('/myappointment', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const tokenEmail = req.decoded.email;

      if (email === tokenEmail) {
        const query = { email: email }
        const myAppointment = await bookingCollection.find(query).toArray();
        return res.send(myAppointment);
      }
      res.status(403).send({ message: "unAthorize access so sorry plage login" });

    });


    // ACCESS_TOKEN and User 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email }
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      });
      res.send({ result, token })
    })



    // Time Slote of Appointment 
    app.get('/avilable', async (req, res) => {
      const date = req.query.date;
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




    // BOOKING SERVICE SLOT 
    app.post('/booking', async (req, res) => {
      const addBooking = req.body;
      const query = { serviceName: addBooking.serviceName, slot: addBooking.slot, email: addBooking.email, date: addBooking.date };
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