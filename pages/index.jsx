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

export default function Dashboard() {
  const [dates, setDates] = useState([null, null]);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState(null);

  useEffect(() => {
    const calculate = async () => {
      if (dates[0] !== null && dates[1] === null) {
        return;
      } else if (dates[0] === null && dates[1] === null) {
        setData(null);
      } else {
        setLoading(true);
        await fetchData(dates.map((_date) => _date.toISOString()));
        setLoading(false);
      }
    };

    calculate();
  }, [dates]); // Depend on 'dates' to trigger the effect

  async function fetchData(_dates_) {
    const queryString = `?dateRange=${encodeURIComponent(
      JSON.stringify(_dates_)
    )}`;

    try {
      const response = await fetch(`/api/getData${queryString}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const _data = await response.json();

      setData(_data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }

  const populate = async (e) => {
    const res = await fetch("/api/populate", {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await res.json();
    console.log(data);
  };

  return (
    <div>
      <div className="bg-slate-200 p-8 items-center sticky top-0 z-50 space-y-3 flex justify-between">
        <DatePickerInput
          w={"90%"}
          clearable
          type="range"
          placeholder="From - To"
          value={dates}
          onChange={setDates}
        />

        {loading && (
          <div className="mt-[-12px]">
            <Loader size={24} />
          </div>
        )}
        {/* <Button
          fullWidth
          onClick={calculate}
          loading={loading}
          disabled={loading}
          type="submit"
          size="sm"
        >
          Calculate
        </Button> */}
      </div>

      {data ? (
        <div className="p-8 space-y-8">
          <Divider labelPosition="right" label="Energy consumption" />

          <LineChart
            h={200}
            data={data?.energyData}
            dataKey="timestamp"
            series={[{ name: "energy_wh", color: "orange.6" }]}
          />

          <Divider labelPosition="right" label="Solar irradiance" />

          <LineChart
            h={200}
            data={data?.irradianceData}
            dataKey="timestamp"
            series={[{ name: "irradiance", color: "blue.6" }]}
          />

          <Divider labelPosition="right" label="Summaries" />

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <div className="space-y-4">
              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Peak energy consumption
                </p>
                <strong>{data?.peakEnergyConsumption?.energy_wh} Wh </strong>
              </div>

              <div className="flex justify-between border-b">
                <p className="text-slate-600 text-[0.8rem]">
                  Total energy consumption
                </p>
                <strong>{data?.totalEnergyConsumption} Wh </strong>
              </div>

              <div className="flex justify-between">
                <p className="text-slate-600 text-[0.8rem]">
                  Average irradiance
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

          <Button onClick={populate} fullWidth>
            Populate
          </Button>
        </div>
      ) : (
        <div>
          <div className="w-3/5 mx-auto absolute left-[50%] translate-x-[-50%] top-[20%]">
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

const Home = () => {
  const [watts, setWatts] = useState(null);
  const [production, setProduction] = useState(null);
  const [status, setStatus] = useState("offline");
  const POLLING_INTERVAL = 1000; // Poll every 1 seconds

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  async function fetchData() {
    try {
      const response = await fetch("/api/getLatest");

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (Date.now() - new Date(data?.current?.createdAt).getTime() < 5000) {
        setStatus("online");
      } else {
        setStatus("offline");
      }

      setWatts(data?.current?.watts);
      setProduction(data?.today);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }

  return (
    <div>
      <div className="my-8">
        <br />
        <div className="w-4/5 relative">
          <div className="absolute border border-l-[1px] border-gray-600 h-[120px] right-[100px]" />
          <Code className="absolute right-[80px] top-[-30px] flex space-x-2">
            {" "}
            <ColorSwatch
              color={status == "online" ? "green" : "orange"}
              size={16}
            />
            <span>{watts} W</span>
          </Code>
          <Image src={myGif} alt="my gif" height={"60vh"} className="w-full" />
        </div>

        <div className="w-full p-8 space-y-4">
          <Card shadow="sm" padding="sm" radius="md" withBorder>
            <p className="text-green-600 font-bold text-[1.2rem]">
              {production?.toFixed(2)} Wh{" "}
            </p>
            <h1 className="uppercase text-[0.7rem] text-gray-500">
              SOLAR PRODUCTION TODAY
            </h1>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Stats = () => {
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const response = await fetch("/api/stats");

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      setDaily(data?.daily);
      setMonthly(data?.monthly);

      console.log(data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }

  return (
    <div className="my-8">
      <Divider label="Last 7 days production" />
      <br />
      <div className="p-4 pr-[80px]">
        <BarChart
          h={200}
          data={daily}
          valueFormatter={(value) => value + " Wh"}
          dataKey="day"
          yAxisProps={{ width: 80 }}
          withTooltip={false}
          barProps={{ radius: 10, barSize: 12 }}
          series={[{ name: "production", color: "green.6" }]}
        />
      </div>
      <br />
      <br />
      <br />
      <Divider label="Last 6 months production" />
      <br />
      <div className="p-4 pr-[80px]">
        <BarChart
          h={200}
          data={monthly}
          valueFormatter={(value) => value + " Wh"}
          dataKey="month"
          yAxisProps={{ width: 80 }}
          withTooltip={false}
          barProps={{ radius: 10, barSize: 12 }}
          series={[{ name: "production", color: "green.6" }]}
        />
      </div>
    </div>
  );
};
