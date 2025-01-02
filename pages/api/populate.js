import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db("wahito");

    const energyCollection = db.collection("energy_data");
    const irradianceCollection = db.collection("irradiance_data");

    // Generate date range
    const startDate = new Date("2024-12-26T00:00:00Z");
    const endDate = new Date("2025-01-09T23:59:59Z");
    const interval = 15 * 60 * 1000; // 15 minutes in milliseconds

    const energyData = [];
    const irradianceData = [];

    for (
      let timestamp = startDate.getTime();
      timestamp <= endDate.getTime();
      timestamp += interval
    ) {
      const createdAt = new Date(timestamp);

      // Generate random values for energy_data
      const voltage = Math.floor(Math.random() * 20) + 1; // Random voltage between 1 and 20
      const current = Math.floor(Math.random() * 20) + 1; // Random current between 1 and 20
      energyData.push({ voltage, current, createdAt });

      // Generate random values for irradiance_data
      const irradiance = Math.floor(Math.random() * 20) + 1; // Random irradiance between 1 and 20
      irradianceData.push({ irradiance, createdAt });
    }

    // Insert data into collections
    await energyCollection.insertMany(energyData);
    await irradianceCollection.insertMany(irradianceData);

    res.status(200).json({
      message: "Data successfully populated",
      energyRecordsInserted: energyData.length,
      irradianceRecordsInserted: irradianceData.length,
    });
  } catch (error) {
    console.error("Error populating data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
