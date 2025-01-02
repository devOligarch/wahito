import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { irradiance, voltage, current } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
      await client.connect();
      const database = client.db("wahito");

      const energy_data_collection = database.collection("energy_data");
      await energy_data_collection.insertOne({
        voltage: parseFloat(voltage),
        current: parseFloat(current),
        createdAt: new Date(),
      });

      const irradiance_data_collection = database.collection("irradiance_data");
      await irradiance_data_collection.insertOne({
        irradiance: parseFloat(irradiance),
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Data saved successfully!" });
    } catch (error) {
      res.status(500).json({ message: "Something went wrong!" });
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ message: "Method not allowed!" });
  }
}
