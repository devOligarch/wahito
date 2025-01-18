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
import { useEffect, useState } from "react";
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
    peakSolarHrs: [],
    averageSolarHrs: null,
  });

  // Fills up chart with data on initial load
  async function getEnergy() {
    try {
      const res = await fetch(`/api/getEnergy`, { method: "GET" });
      if (!res?.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await res.json();

      setData({ ...data, chart: data });
    } catch (error) {
      console.error("Error occured during fetch call", error);
    }
  }

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        await getEnergy();
      } catch (error) {
        console.log(error);
      }
    };
    fetchChartData();
  }, []);

  // Calculate days of autonomy
  const getDaysOfAutonomy = () => {
    const timeDifference = Math.abs(dates[1] - dates[0]);
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    return daysDifference;
  };

  // Calculate for summaries and recommendations
  const calculate = async () => {
    if (dates[0] && dates[1]) {
      const queryString = `?dateRange=${encodeURIComponent(
        JSON.stringify(dates.map((d) => d.toISOString()))
      )}`;

      setLoading(true);

      try {
        const res = await fetch(`/api/getData${queryString}`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await res.json();

        console.log(data);
        setData(data);
      } catch (error) {
        console.error("Failed to calculate", error);
      }

      setLoading(false);
    }
    return;
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-slate-200 p-8  sticky top-0 z-50 space-y-2 ">
        <div className="space-y-3 flex justify-between items-center">
          <DatePickerInput
            w={"90%"}
            clearable
            type="range"
            placeholder="From - To"
            value={dates}
            onClear
            onChange={setDates}
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
        <p>
          Days of autonomy :{" "}
          <strong>{dates[0] && dates[1] ? getDaysOfAutonomy() : 0}</strong>
        </p>

        <Divider labelPosition="right" label="Energy consumption" />

        <LineChart
          h={200}
          data={data?.chart}
          dataKey="timestamp"
          series={[{ name: "energy_wh", color: "orange.6" }]}
        />
      </div>

      {data?.averageEnergy && dates[0] && dates[1] ? (
        <div className="p-4 space-y-3">
          <Divider
            labelPosition="right"
            label={`${moment(dates[0]).format("Do MMM YY")} to ${moment(
              dates[1]
            ).format("Do MMM YY")}`}
          />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Total energy consumption
                </p>
                <strong>{data?.totalEnergy} Wh </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Average daily energy consumption
                </p>
                <strong>{data?.averageEnergy} Wh </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">Peak load</p>
                <strong>{data?.peakEnergy?.energy_wh} Wh</strong>
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
                  {data?.averageIrradiance} W/m<sup>2</sup>
                </strong>
              </div>
            </div>
          </Card>

          <Divider labelPosition="right" label="Recommendations" />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Solar panels recommendation
                </p>
                <strong>30 kWp </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Battery capacity recommendation
                </p>
                <strong>30 kWh </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">
                  Inverter recommendation
                </p>
                <strong>30 kW </strong>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div>
          <div className="w-3/5 mx-auto absolute left-[50%] translate-x-[-50%] top-[55%]">
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
