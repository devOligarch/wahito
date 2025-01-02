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

      const getEnergyRecords = async () => {
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
            timestamp: moment(curr.createdAt).format("MMM Do h:mma"),
          });
        }

        return calculatedData;
      };

      const getIrradianceRecords = async () => {
        const irradianceCollection = db.collection("irradiance_data");
        const irradiance_records = await irradianceCollection
          .find({
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          })
          .sort({ createdAt: 1 })
          .toArray();

        const calculatedData = [];

        for (let i = 1; i < irradiance_records.length; i++) {
          const curr = irradiance_records[i];

          calculatedData.push({
            irradiance: curr.irradiance,
            timestamp: moment(curr.createdAt).format("MMM Do h:mma"),
          });
        }

        return calculatedData;
      };

      // Refine data as per requirements
      const getEnergyData = async () => {
        let _calculatedData = await getEnergyRecords();

        const interval = Math.floor(_calculatedData.length / elements);

        const selectedData = Array.from({ length: elements }, (_, index) => {
          const selectedIndex = index * interval;
          return _calculatedData[
            Math.min(selectedIndex, _calculatedData.length - 1)
          ];
        });

        return selectedData;
      };

      const getIrradianceData = async () => {
        const _calculatedData = await getIrradianceRecords();

        const interval = Math.floor(_calculatedData.length / elements);

        const selectedData = Array.from({ length: elements }, (_, index) => {
          const selectedIndex = index * interval;
          return _calculatedData[
            Math.min(selectedIndex, _calculatedData.length - 1)
          ];
        });

        return selectedData;
      };

      const getPeakEnergyConsumption = async () => {
        let _calculatedData = await getEnergyRecords();

        return _calculatedData.reduce((max, obj) => {
          return obj.energy_wh > max.energy_wh ? obj : max;
        }, _calculatedData[0]);
      };

      const getTotalEnergyConsumption = async () => {
        let _calculatedData = await getEnergyRecords();

        return Math.floor(
          _calculatedData.reduce((total, obj) => total + obj.energy_wh, 0)
        );
      };

      const getAverageIrradiance = async () => {
        const _calculatedData = await getIrradianceRecords();

        const totalIrradiance = _calculatedData.reduce(
          (total, obj) => total + obj.irradiance,
          0
        );

        return Math.floor(totalIrradiance / _calculatedData.length);
      };

      let energyData = await getEnergyData();
      let irradianceData = await getIrradianceData();
      let peakEnergyConsumption = await getPeakEnergyConsumption();
      let totalEnergyConsumption = await getTotalEnergyConsumption();
      let averageIrradiance = await getAverageIrradiance();

      res.status(200).json({
        energyData,
        irradianceData,
        peakEnergyConsumption,
        totalEnergyConsumption,
        averageIrradiance,
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
