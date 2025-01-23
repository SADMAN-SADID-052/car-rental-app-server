const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());




const uri = "mongodb+srv://car-rental-system:Ek2KQFB1Z62epkPf@cluster0.ymsgi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {



    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carCollection = client.db("carrentalDB").collection("carRental");


    // post add car
    app.post("/carRental", async (req, res) => {
      const newCar = req.body;
      console.log(newCar);

      const result = await carCollection.insertOne(newCar);
      res.send(result);
    });

    // Read all

    app.get("/carRental", async (req, res) => {
      const cursor = carCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // car details

    app.get("/carRental/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log("id", id);

        const query = { _id: new ObjectId(id) };

        const review = await carCollection.findOne(query);

        if (review) {
          return res.send(review);
        }
        res.status(404).send({ message: "Review not found" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{

    res.send('Car rental server is running')
})

app.listen(port,() =>{

    console.log(`Car Rental System is running on port : ${port}`)
})