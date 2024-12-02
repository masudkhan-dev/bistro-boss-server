const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    // allowedHeaders: ["Authorization", "Content-Type"],
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rjtqv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("resturentDB").collection("users");
    const menuCollection = client.db("resturentDB").collection("menu");
    const reviewCollection = client.db("resturentDB").collection("review");
    const cartCollection = client.db("resturentDB").collection("carts");

    // jwt api
    app.post("/jwt", async (req, res) => {
      const token = jwt.sign(req.body, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // jwt: middlewar
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      // console.log("Authorization Header:", req.headers.authorization);

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // jwt middle ware: verifyAdmin after varifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user collection
    app.post("/users", verifyToken, async (req, res) => {
      const query = { email: req.body.email };
      const existUser = await userCollection.findOne(query);

      if (existUser) {
        return res.send({ message: "user already exits", insertedId: null });
      }

      const result = await userCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const user = await userCollection.findOne({ email });

      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const result = await userCollection.deleteOne(id);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = { _id: new ObjectId(req.params.id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(id, updateDoc);

        res.send(result);
      }
    );

    // menu item collection
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const result = await menuCollection.findOne(id);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: {
          name: req.body.name,
          category: req.body.category,
          price: req.body.price,
          recipe: req.body.recipe,
          image: req.body.image,
        },
      };
      const result = await menuCollection.updateOne(id, updateDoc);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const result = await menuCollection.insertOne(req.body);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const result = await menuCollection.deleteOne(id);
      res.send(result);
    });

    // reviews collection
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // carts collection
    app.post("/carts", async (req, res) => {
      const result = await cartCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/carts/:userEmail", async (req, res) => {
      const userEmail = req.params.userEmail;
      const query = {
        userEmail: userEmail,
      };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const result = await cartCollection.deleteOne(id);
      res.send(result);
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
  res.send("bistro boss resturent server is coocking");
});

app.listen(port, () => {
  console.log(`resuting cooking on ${port}`);
});
