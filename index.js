const express = require("express");
const cors = require("cors");
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ymsgi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carCollection = client.db("carrentalDB").collection("carRental");
    const bookinglistCollection = client
      .db("carrentalDB")
      .collection("bookinglist");

    // post add car
    app.post("/carRental", async (req, res) => {
      const newCar = req.body;
      console.log(newCar);
      newCar.addedAt = new Date().toISOString();

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

    // Add to Booking list

    app.post("/bookinglist", async (req, res) => {
      try {
        const {
          carModel,
          carImage,
          rentalPrice,
          status,

          addedBy,
        } = req.body;

        if (!carModel || !carImage || !rentalPrice || !addedBy) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        const bookingslistItem = {
          carModel,
          carImage,
          rentalPrice,
          addedBy,
          addedAt: new Date(),
        };

        const result = await bookinglistCollection.insertOne(bookingslistItem);
        res
          .status(201)
          .send({
            success: true,
            data: result,
            message: "Added to BookingList",
          });
      } catch (error) {
        console.error("Error adding to bookinglist:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //get Booking list

    app.get("/bookinglist", async (req, res) => {
      try {
        const userEmail = req.query.email; // Email of the logged-in user
        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        // Find booking list items where addedBy.email matches the user's email
        const bookingslistItems = await bookinglistCollection
          .find({ "addedBy.email": userEmail })
          .toArray();

        // Add dynamic status field to each booking
        const updatedBookingsList = bookingslistItems.map((item) => {
          const currentDate = new Date();
          const bookingDate = new Date(item.addedAt); // Assuming `addedAt` stores the booking date

          let status = "Pending"; // Default status
          if (item.isCanceled) {
            status = "Canceled";
          } else if (bookingDate < currentDate) {
            status = "Confirmed";
          }

          return { ...item, status }; // Include the calculated status
        });

        res.status(200).send({ success: true, data: updatedBookingsList });
      } catch (error) {
        console.error("Error fetching booking list:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //  My Cars
    app.get("/carRental", async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const userCars = await carCollection
          .find({ email: userEmail })
          .toArray();
        res.send(userCars);
      } catch (error) {
        console.log("Error fetching user Cars:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    /**
     * Update a car by ID
     */
    app.put("/carRental/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await carCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Car not found or no changes made" });
        }

        res
          .status(200)
          .send({ success: true, message: "Car updated successfully" });
      } catch (error) {
        console.error("Error updating car:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // delete my car
    app.delete("/carRental/:id", async (req, res) => {
      const carId = req.params.id;
      try {
        const result = await carCollection.deleteOne({
          _id: new ObjectId(carId),
        });

        if (result.deletedCount === 1) {
          res
            .status(200)
            .send({ success: true, message: "Car deleted successfully!" });
        } else {
          res.status(404).send({ success: false, message: "Car not found!" });
        }
      } catch (error) {
        console.error("Error deleting car:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete car." });
      }
    });

    // DELETE: Cancel a booking
    app.delete("/bookinglist/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookinglistCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount > 0) {
          res.status(200).send({ success: true, message: "Booking canceled." });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Booking not found." });
        }
      } catch (error) {
        console.error("Error canceling booking:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to cancel booking." });
      }
    });

    // PATCH: Modify a booking date
    app.patch("/modifybooking/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { date } = req.body;
        if (!date) {
          return res
            .status(400)
            .send({ success: false, message: "Date is required." });
        }

        const result = await bookinglistCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { date: new Date(date) } }
        );

        if (result.modifiedCount > 0) {
          res
            .status(200)
            .send({ success: true, message: "Booking date updated." });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Booking not found." });
        }
      } catch (error) {
        console.error("Error updating booking date:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update booking date." });
      }
    });

    app.get("/carRental", async (req, res) => {
      const { page = 1, limit = 3 } = req.query; // Defaults to page 1, limit 3
      const skip = (page - 1) * limit;

      try {
        if (!carCollection) {
          return res
            .status(500)
            .send({ success: false, message: "Database not connected." });
        }

        const recentCars = await carCollection
          .find()
          .sort({ createdAt: -1 }) // Sort by most recently added
          .skip(skip) // Skip previous pages
          .limit(parseInt(limit)) // Limit to cars per page
          .toArray();

        res.status(200).send({ success: true, data: recentCars });
      } catch (error) {
        console.error(
          "Error fetching recent listings at /carRental:",
          error.message,
          error.stack
        );
        res
          .status(500)
          .send({
            success: false,
            message: "Failed to fetch recent listings.",
          });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car rental server is running");
});

app.listen(port, () => {
  console.log(`Car Rental System is running on port : ${port}`);
});
