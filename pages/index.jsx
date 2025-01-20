import localFont from "next/font/local";
import {
  Avatar,
  Menu,
  Tabs,
  UnstyledButton,
  Code,
  ColorSwatch,
  Card,
  Text,
  Badge,
  Divider,
  Button,
  Loader,
} from "@mantine/core";
import Image from "next/image";
import myGif from "../public/solaronly.gif";
import classes from "../styles/Tab.module.css";
import { useCallback, useEffect, useState } from "react";
import { BarChart, LineChart } from "@mantine/charts";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import moment from "moment";

export default function Dashboard() {
  const [dates, setDates] = useState([null, null]);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    chart: [],
    // energy
    peakEnergy: null,
    totalEnergy: null,
    averageEnergy: null,
    // solar
    averageSolarHrs: null,
    peakSolarHrs: [],
  });

  // Get initial data
  const getInitialChart = async () => {
    // Initial energy chart data
    try {
      const res = await fetch(`/api/getEnergy`, { method: "GET" });
      if (!res?.ok) {
        throw new Error("Network response was not ok");
      }

      const chartData = await res.json();
      return chartData;
    } catch (error) {
      console.error("Error occured during fetch call", error);
      return [];
    }
  };

  // Calculate solar data on load
  const getPeakSolarHrs = useCallback(async () => {
    const years = [2023, 2024];
    let peakSolarHrs = [];

    // Solar data
    try {
      const res = await fetch("/solar_irradiance_data.json"); // File path in public folder
      const _records = await res.json();

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
        const peakHours = Number((totalIrradiance / (365 * 1000)).toFixed(2));

        peakSolarHrs.push({ year, peakHours });
      }

      return peakSolarHrs;
    } catch (error) {
      console.error("Something occured", error);
      return [];
    }
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const chart = await getInitialChart();
        const peakSolarHrs = await getPeakSolarHrs();
        console.log(chart, peakSolarHrs);

        setData({ ...data, chart, peakSolarHrs });
        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    };
    fetchChartData();
  }, []);

  // Calculate for summaries and recommendations
  const calculate = async () => {
    if (dates[0] && dates[1]) {
      const queryString = `?dateRange=${encodeURIComponent(
        JSON.stringify(dates.map((d) => d.toISOString()))
      )}`;

      try {
        setLoading(true);
        const res = await fetch(`/api/getData${queryString}`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error("Network response was not ok");
        }

        const fetchedData = await res.json();
        const { chart, averageEnergy, totalEnergy, peakEnergy } = fetchedData;

        const peakSolarHrs = await getPeakSolarHrs();

        setData({
          ...data,
          chart,
          averageEnergy,
          totalEnergy,
          peakEnergy,
          peakSolarHrs,
        });
        setLoading(false);
        return;
      } catch (error) {
        console.error("Failed to calculate", error);
        setLoading(false);
        return;
      }
    }
  };

  /** System sizing calculations **/

  // Inverter sizing
  const marketSizes = [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000];
  let inverterSizing = (data?.peakEnergy?.energy_wh / 0.25) * 1.25;
  const roundedInverterSize = marketSizes.find(
    (size) => size >= inverterSizing
  );
  const finalInverterSize = roundedInverterSize || Math.max(...marketSizes);

  // Battery sizing
  let daysOfAutonomy = 1.5;

  const getBatteryVoltage = (inverterSize) => {
    let voltage;

    if (inverterSize > 0 && inverterSize <= 2000) {
      voltage = 12;
    } else if (inverterSize > 2000 && inverterSize <= 4000) {
      voltage = 24;
    } else if (inverterSize > 4000) {
      voltage = 48;
    } else {
      voltage = null;
    }

    return voltage;
  };

  const getBatteryCapacity = (
    daysOfAutonomy,
    batteryVoltage,
    dailyAvgEnergy
  ) => {
    console.log(daysOfAutonomy, batteryVoltage, dailyAvgEnergy);
    let capacities = [];

    let types = ["lead-acid", "lithium-ion"];

    for (let type of types) {
      let DoD = type == "lead-acid" ? 0.5 : 0.8;
      let _capacity = Math.ceil(
        (dailyAvgEnergy * daysOfAutonomy) / (batteryVoltage * DoD)
      );
      let roundedCapacity = Math.ceil(_capacity / 50) * 50;

      capacities.push({
        type,
        capacity: roundedCapacity,
      });
    }

    return capacities;
  };

  let voltage = getBatteryVoltage(finalInverterSize);
  let capacity = getBatteryCapacity(
    daysOfAutonomy,
    voltage,
    data?.averageEnergy
  );

  // Solar panel sizing
  const solarPanelWattage = Math.ceil(
    (voltage * capacity[0]?.capacity) / data?.peakSolarHrs[1]?.peakHours
  );

  const roundedSolarPanelWattage = Math.ceil(solarPanelWattage / 50) * 50;

  // Clear energy data on date change
  const handleOnDateChange = useCallback(async (_dates) => {
    if ((_dates[0] && _dates[1]) || (_dates[0] && !_dates[1])) {
      setDates(_dates);
    } else {
      setDates([null, null]);

      setData({
        ...data,
        peakEnergy: null,
        totalEnergy: null,
        averageEnergy: null,
      });
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="bg-slate-200 p-8  sticky top-0 z-50 space-y-2 ">
        <div className="space-y-3 flex justify-between items-center">
          <DatePickerInput
            clearable
            w={"90%"}
            type="range"
            placeholder="From - To"
            value={dates}
            onChange={handleOnDateChange}
          />

          {loading && (
            <div className="mt-[-12px]">
              <Loader size={24} />
            </div>
          )}
        </div>
        <Button
          fullWidth
          onClick={calculate}
          disabled={loading}
          type="submit"
          size="sm"
        >
          Calculate
        </Button>
      </div>

      {/* Main content */}

      <div className="p-4 space-y-3">
        <Divider labelPosition="right" label="Energy consumption" />
        <br />

        <div className="ml-[-20px]">
          <LineChart
            h={200}
            data={data?.chart}
            dataKey="timestamp"
            series={[
              {
                name: "energy_wh",
                color: "orange.6",
                label: "Energy consumption",
              },
            ]}
            yAxisProps={null}
            withPointLabels
          />
        </div>
      </div>

      {data?.averageEnergy && dates[0] && dates[1] ? (
        <div className="p-4 space-y-3">
          <Divider
            labelPosition="right"
            label={`${moment(dates[0]).format("Do MMM YY")} to ${moment(
              dates[1]
            ).format("Do MMM YY")} energy consumption`}
          />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Total energy consumption
                </p>
                <strong>{data?.totalEnergy.toLocaleString("en-US")} Wh </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Average daily energy consumption
                </p>
                <strong>
                  {data?.averageEnergy.toLocaleString("en-US")} Wh{" "}
                </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">
                  Peak ({data?.peakEnergy?.timestamp})
                </p>
                <strong>
                  {data?.peakEnergy?.energy_wh.toLocaleString("en-US")} Wh
                </strong>
              </div>
            </div>
          </Card>

          <Divider labelPosition="right" label="Solar information" />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Peak sun hrs (2023)
                </p>
                <strong>{data?.peakSolarHrs[0]?.peakHours} hrs </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Peak sun hrs (2024)
                </p>
                <strong>{data?.peakSolarHrs[1]?.peakHours} hrs </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">
                  Average peak sun hrs
                </p>
                <strong>
                  {(data?.peakSolarHrs[0]?.peakHours +
                    data?.peakSolarHrs[1]?.peakHours) /
                    2}{" "}
                  hrs
                </strong>
              </div>
            </div>
          </Card>

          <Divider labelPosition="right" label="Recommendations" />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">Solar panels</p>
                <strong>{roundedSolarPanelWattage} W </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Battery capacity (Lead acid)
                </p>
                <strong>
                  {capacity[0]?.capacity} Ah , {voltage} V{" "}
                </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Battery capacity (Li-Ion)
                </p>
                <strong>
                  {capacity[1]?.capacity} Ah , {voltage} V{" "}
                </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">Inverter</p>
                <strong>{finalInverterSize} W </strong>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div>
          <div className="w-3/5 mx-auto absolute left-[50%] translate-x-[-50%] top-[57%]">
            <img src="/empty.svg" alt="" />
            <br />
            <h1 className="text-[1.5rem] font-bold w-full text-center">
              Get started
            </h1>
            <p className="text-[0.8rem] text-slate-600 text-center mt-3">
              Start by picking dates above to get statistics and system sizing
              recommendations.
            </p>
          </div>
          <br />
        </div>
      )}
    </div>
  );
}
