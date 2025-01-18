import moment from "moment";
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const client = new MongoClient(
      "mongodb+srv://devOligarch:!%40Kinuthia2024!@devworks.s8vt2mn.mongodb.net/?retryWrites=true&w=majority&appName=DevWorks"
    );

    let elements = 10;

    try {
      await client.connect();

      const db = client.db("wahito");

      const [startDate, endDate] = JSON.parse(req.query?.dateRange).map(
        (date) => new Date(date)
      );

      // Energy

      const getAllEnergy = async () => {
        const energyCollection = db.collection("energy_data");
        const energy_records = await energyCollection
          .find({
            createdAt: {
              $gte: startDate,
              $lte: endDate,
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

        return calculatedData;
      };

      const getEnergyData = async () => {
        let _calculatedData = await getAllEnergy();

        const interval = Math.floor(_calculatedData.length / elements);

        const selectedData = Array.from({ length: elements }, (_, index) => {
          const selectedIndex = index * interval;
          return _calculatedData[
            Math.min(selectedIndex, _calculatedData.length - 1)
          ];
        });

        return selectedData;
      };

      const getPeakEnergy = async () => {
        let _calculatedData = await getEnergyData();

        return _calculatedData.reduce((max, obj) => {
          return obj.energy_wh > max.energy_wh ? obj : max;
        }, _calculatedData[0]);
      };

      const getTotalEnergy = async () => {
        let _calculatedData = await getAllEnergy();

        return Math.floor(
          _calculatedData.reduce((total, obj) => total + obj.energy_wh, 0)
        );
      };

      const getAverageEnergy = async () => {
        let _calculatedData = await getAllEnergy();

        let total = Math.floor(
          _calculatedData.reduce((total, obj) => total + obj.energy_wh, 0)
        );

        const timeDifference = Math.abs(endDate - startDate);

        const daysDifference = Math.ceil(
          timeDifference / (1000 * 60 * 60 * 24)
        );

        return Math.ceil(total / daysDifference);
      };

      // Solar

      const getPeakSolar = async () => {
        const years = [2023, 2024];
        const results = [];

        const _records = await db.collection("ghis").find().toArray();

        for (const year of years) {
          const startDate = new Date(`${year}-01-01T00:00:00Z`);
          const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

          let records = _records?.filter(
            (record) =>
              new Date(record?.period_end) > startDate &&
              new Date(record?.period_end) < endDate
          );

          const totalIrradiance = records.reduce((sum, record) => {
            return sum + record.ghi * 0.25; // GHI * 15 minutes (0.25 hours)
          }, 0);

          // Calculate daily average irradiance (peak sun hours)
          const peakHours = (totalIrradiance / (365 * 1000)).toFixed(1);

          results.push({ year, peakHours });
        }

        return results;
      };

      let chart = await getEnergyData();
      let averageEnergy = await getAverageEnergy();
      let totalEnergy = await getTotalEnergy();
      let peakEnergy = await getPeakEnergy();
      let peakSolarHrs = await getPeakSolar();

      res.status(200).json({
        chart,
        averageEnergy,
        totalEnergy,
        peakEnergy,
        peakSolarHrs,
      });
    } catch (error) {
      res.status(500).json({ message: "Something went wrong!" });
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ message: "Method not allowed!" });
  }
}
