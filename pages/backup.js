const calculate = async () => {
  if (dates[0] !== null && dates[1] !== null) {
    setLoading(true);
    await fetchData(dates.map((_date) => _date.toISOString()));
    setLoading(false);
  } else {
    return;
  }
};

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
    console.log(_data);

    setData(_data);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
}

// Show graph on page load
useEffect(() => {
  const fetchDatesData = async () => {
    try {
      let today = new Date();
      let startDate = new Date();
      startDate.setDate(today.getDate() - 7); // Calculate 7 days ago

      let isoDates = [startDate, today];
      await fetchGraphData(isoDates.map((_date) => _date.toISOString())); // Call fetchData with ISO string dates
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  fetchDatesData(); // Call the async function
}, []);

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
