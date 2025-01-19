import moment from "moment";
import { MongoClient } from "mongodb";
import { MONGO_LOCAL } from "@/utils/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const client = new MongoClient(MONGO_LOCAL);

    try {
      await client.connect();

      let startTime = new Date();
      startTime.setTime(startTime.getTime() - 3 * 60 * 60 * 1000);

      const db = client.db("wahito");
      const energyCollection = db.collection("energy_data");
      const energy_records = await energyCollection
        .find({
          createdAt: {
            $gte: startTime,
            $lte: new Date(),
          },
        })
        .sort({ createdAt: 1 })
        .toArray();

      const calculatedData = [];

      for (let i = 1; i < energy_records.length; i++) {
        const prev = energy_records[i - 1];
        const curr = energy_records[i];

        const hoursDiff =
          (new Date(curr.createdAt) - new Date(prev.createdAt)) /
          (1000 * 60 * 60);

        const energy_wh = prev.voltage * prev.current * hoursDiff;

        calculatedData.push({
          energy_wh,
          timestamp: `${moment(prev.createdAt).format(
            "MMM Do h:mma"
          )} - ${moment(curr.createdAt).format("MMM Do h:mma")}`,
        });
      }
      res.status(200).json(calculatedData);
    } catch (err) {
      res.status(500).json({ message: "Something went wrong!", err });
    }
  }
}
