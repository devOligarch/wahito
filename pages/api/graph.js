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

      // const getIrradianceRecords = async () => {
      //   const irradianceCollection = db.collection("irradiance_data");
      //   const irradiance_records = await irradianceCollection
      //     .find({
      //       createdAt: {
      //         $gte: startDate,
      //         $lte: endDate,
      //       },
      //     })
      //     .sort({ createdAt: 1 })
      //     .toArray();

      //   const calculatedData = [];

      //   for (let i = 1; i < irradiance_records.length; i++) {
      //     const curr = irradiance_records[i];

      //     calculatedData.push({
      //       irradiance: curr.irradiance,
      //       timestamp: moment(curr.createdAt).format("MMM Do h:mma"),
      //     });
      //   }

      //   return calculatedData;
      // };

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

      // const getIrradianceData = async () => {
      //   const _calculatedData = await getIrradianceRecords();

      //   const interval = Math.floor(_calculatedData.length / elements);

      //   const selectedData = Array.from({ length: elements }, (_, index) => {
      //     const selectedIndex = index * interval;
      //     return _calculatedData[
      //       Math.min(selectedIndex, _calculatedData.length - 1)
      //     ];
      //   });

      //   return selectedData;
      // };

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

      const getAverageEnergyConsumption = async () => {
        let _calculatedData = await getEnergyRecords();

        let total = Math.floor(
          _calculatedData.reduce((total, obj) => total + obj.energy_wh, 0)
        );

        const timeDifference = Math.abs(endDate - startDate);

        const daysDifference = Math.ceil(
          timeDifference / (1000 * 60 * 60 * 24)
        );

        return Math.ceil(total / daysDifference);
      };

      const getPeakSunHours = async () => {
        const years = [2023, 2024];
        const results = [];

        const _records = await db.collection("ghis").find().toArray();

        for (const year of years) {
          const startDate = new Date(`${year}-01-01T00:00:00Z`);
          const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

          // Fetch data from the database for the year

          let records = _records?.filter(
            (record) =>
              new Date(record?.period_end) > startDate &&
              new Date(record?.period_end) < endDate
          );

          // Calculate total annual irradiance
          const totalIrradiance = records.reduce((sum, record) => {
            return sum + record.ghi * 0.25; // GHI * 15 minutes (0.25 hours)
          }, 0);

          // Calculate daily average irradiance (peak sun hours)
          const peakHours = (totalIrradiance / 365) * 100;

          results.push({ year, peakHours });
        }

        return results;
      };

      let peakSunHrs = await getPeakSunHours();

      let energyData = await getEnergyData();
      let averageEnergyConsumption = await getAverageEnergyConsumption();
      let peakEnergyConsumption = await getPeakEnergyConsumption();
      let totalEnergyConsumption = await getTotalEnergyConsumption();
      // let averageIrradiance = await getAverageIrradiance();
      // let irradianceData = await getIrradianceData();
      let peakSunHrs2023 = peakSunHrs[0].peakHours;
      let peakSunHrs2024 = peakSunHrs[1].peakHours;

      console.log(peakSunHrs);

      res.status(200).json({
        energyData,
        averageEnergyConsumption,
        peakEnergyConsumption,
        totalEnergyConsumption,
        peakSunHrs2023,
        peakSunHrs2024,
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
