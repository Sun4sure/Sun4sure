// 📦 Imports
import * as React from "react";
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// Type definitions for state and props
interface Contact {
  name: string;
  email: string;
  phone: string;
}

interface Results {
  requiredKW: number;
  area: number;
  cost: number;
  monthlyGridBill: number;
  monthlySavings: number;
  paybackYears: number;
  batteryKWh: number;
  num150AhBatteries: number;
  areaComment: string;
  initialSolarCost: number;
}

interface Appliance {
  name: string;
  power: number;
  hoursPerDay: number;
  daysPerMonth: number;
}

const defaultContact: Contact = { name: "", email: "", phone: "" };
const defaultResults: Results = {
  requiredKW: 0,
  area: 0,
  cost: 0,
  monthlyGridBill: 0,
  monthlySavings: 0,
  paybackYears: 0,
  batteryKWh: 0,
  num150AhBatteries: 0,
  areaComment: "",
  initialSolarCost: 0
};

const installersList = [
  { name: "SunGrid Pvt Ltd", email: "sungrid@example.com" },
  { name: "BrightWatts Solutions", email: "brightwatts@example.com" },
  { name: "SolarCraft India", email: "solarcraft@example.com" }
];

const presets: Record<string, Appliance[]> = {
  "Basic Rural Home": [
    { name: "Fan", power: 75, hoursPerDay: 6, daysPerMonth: 30 },
    { name: "LED Bulb", power: 9, hoursPerDay: 6, daysPerMonth: 30 },
    { name: "TV", power: 100, hoursPerDay: 3, daysPerMonth: 30 },
    { name: "Fridge", power: 150, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Router", power: 10, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Mobile Chargers", power: 10, hoursPerDay: 2, daysPerMonth: 30 }
  ],
  "Urban Middle-Class Flat": [
    { name: "Fan", power: 75, hoursPerDay: 6, daysPerMonth: 30 },
    { name: "LED Bulb", power: 9, hoursPerDay: 5, daysPerMonth: 30 },
    { name: "TV", power: 100, hoursPerDay: 3, daysPerMonth: 30 },
    { name: "Fridge", power: 150, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Router", power: 10, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Mobile Chargers", power: 10, hoursPerDay: 2, daysPerMonth: 30 },
    { name: "Laptop", power: 60, hoursPerDay: 5, daysPerMonth: 30 },
    { name: "Washing Machine", power: 500, hoursPerDay: 0.5, daysPerMonth: 8 },
    { name: "Water Purifier (RO)", power: 50, hoursPerDay: 2, daysPerMonth: 30 },
    { name: "Oven", power: 1200, hoursPerDay: 0.5, daysPerMonth: 30 }
  ],
  "Modern Urban Villa": [
    { name: "Fan", power: 75, hoursPerDay: 6, daysPerMonth: 30 },
    { name: "LED Bulb", power: 9, hoursPerDay: 5, daysPerMonth: 30 },
    { name: "TV", power: 100, hoursPerDay: 3, daysPerMonth: 30 },
    { name: "Fridge", power: 150, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Router", power: 10, hoursPerDay: 24, daysPerMonth: 30 },
    { name: "Mobile Chargers", power: 10, hoursPerDay: 2, daysPerMonth: 30 },
    { name: "Laptop", power: 60, hoursPerDay: 4, daysPerMonth: 30 },
    { name: "AC", power: 1500, hoursPerDay: 5, daysPerMonth: 30 },
    { name: "Washing Machine", power: 500, hoursPerDay: 1, daysPerMonth: 10 },
    { name: "Water Purifier (RO)", power: 50, hoursPerDay: 2, daysPerMonth: 30 },
    { name: "Oven", power: 1200, hoursPerDay: 1, daysPerMonth: 30 }
  ],
  Custom: []
};

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<string>("Monthly");
  const [contact, setContact] = useState<Contact>(defaultContact);
  const [results, setResults] = useState<Results>(defaultResults);
  const [location, setLocation] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [sunHours, setSunHours] = useState<number>(5.5);
  const [gridRate, setGridRate] = useState<number>(8);
  const [degradationRate, setDegradationRate] = useState<number>(0.8);
  const [availableArea, setAvailableArea] = useState<number>(0);
  const [monthlyUnits, setMonthlyUnits] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("Basic Rural Home");
  const [selectedInstaller, setSelectedInstaller] = useState<string>(installersList[0].name);
  const [chartUrl, setChartUrl] = useState<string>("");

  const handleGetLocation = (): void => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => alert("Unable to retrieve your location.")
    );
  };

  useEffect(() => {
    if (location.lat !== null && location.lon !== null) {
      fetch(
        `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${location.lon}&latitude=${location.lat}&format=JSON`
      )
        .then((res) => res.json())
        .then((data) => {
          const avg = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
          if (avg) {
            const monthly = Object.values(avg) as number[];
            const mean = monthly.reduce((a, b) => a + Number(b), 0) / monthly.length;
            setSunHours(parseFloat(mean.toFixed(2)));
          } else {
            alert("Failed to fetch sun hours. Using default value.");
            setSunHours(5.5);
          }
        })
        .catch(() => {
          alert("Failed to fetch sun hours. Using default value.");
          setSunHours(5.5);
        });
    }
  }, [location]);

  const generateChartUrl = (res: Results): string => {
    const { initialSolarCost, monthlyGridBill, monthlySavings } = res;

    const years = 25;
    const labels = Array.from({ length: years }, (_, i) => `Year ${i + 1}`);
    const gridCosts = labels.map(
      (_, i) => monthlyGridBill * 12 * ((Math.pow(1.05, i + 1) - 1) / 0.05)
    );

    let cumulativeSolarSavings: number[] = [];
    let annualSaving = monthlySavings * 12;
    let runningTotal = 0;
    for (let i = 0; i < years; i++) {
      if (i > 0) annualSaving *= 1 - degradationRate / 100;
      runningTotal += annualSaving;
      cumulativeSolarSavings.push(runningTotal);
    }

    const netSolarLine = labels.map(
      (_, i) =>
        initialSolarCost +
        monthlyGridBill * 12 * ((Math.pow(1.05, i + 1) - 1) / 0.05) -
        cumulativeSolarSavings[i]
    );

    const paybackIndex = netSolarLine.findIndex((val, i) => val <= gridCosts[i]);

    const chartConfig = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Cumulative Grid Cost (₹)",
            data: gridCosts,
            borderColor: "#f00",
            fill: false
          },
          {
            label: "Cumulative Solar Net Cost (₹)",
            data: netSolarLine,
            borderColor: "#0a0",
            fill: false,
            pointBackgroundColor: labels.map((_, i) =>
              i === paybackIndex ? "blue" : "#0a0"
            ),
            pointRadius: labels.map((_, i) => (i === paybackIndex ? 8 : 3))
          }
        ]
      },
      options: {
        plugins: {
          annotation: {
            annotations:
              paybackIndex >= 0
                ? {
                    paybackLine: {
                      type: "line",
                      scaleID: "x",
                      value: `Year ${paybackIndex + 1}`,
                      borderColor: "blue",
                      borderWidth: 2,
                      label: {
                        content: `Payback: Year ${paybackIndex + 1}`,
                        enabled: true,
                        position: "start",
                        backgroundColor: "blue",
                        color: "white"
                      }
                    },
                    beforePayback: {
                      type: "box",
                      xMin: `Year 1`,
                      xMax: `Year ${paybackIndex + 1}`,
                      backgroundColor: "rgba(255, 0, 0, 0.08)",
                      borderWidth: 0
                    },
                    afterPayback: {
                      type: "box",
                      xMin: `Year ${paybackIndex + 1}`,
                      xMax: `Year ${labels.length}`,
                      backgroundColor: "rgba(0, 255, 0, 0.08)",
                      borderWidth: 0
                    }
                  }
                : {}
          }
        },
        title: {
          display: true,
          text: "25-Year Grid vs Solar Net Cost (with Payback Highlight)"
        },
        tooltips: {
          callbacks: {
            label: function (tooltipItem: any, data: any) {
              return (
                data.datasets[tooltipItem.datasetIndex].label +
                ": ₹" +
                tooltipItem.yLabel.toLocaleString()
              );
            }
          }
        }
      }
    };

    return `https://quickchart.io/chart?width=600&height=300&c=${encodeURIComponent(
      JSON.stringify(chartConfig)
    )}`;
  };

  const calculatePaybackYears = (cost: number, monthlySavings: number): number => {
    if (!monthlySavings || monthlySavings <= 0) return 0;
    return parseFloat((cost / (monthlySavings * 12)).toFixed(1));
  };

  const estimateFromMonthlyUnits = (units: number): void => {
    if (!units || units <= 0 || sunHours <= 0) {
      alert("Please enter valid monthly units and sun hours for accurate estimation.");
      return;
    }
    const requiredKW = parseFloat((units / (sunHours * 30)).toFixed(2));
    const area = parseFloat((requiredKW * 10).toFixed(2));
    const cost = parseFloat((requiredKW * 60000).toFixed(0));
    const monthlyGridBill = parseFloat((units * gridRate).toFixed(0));
    const monthlySavings = monthlyGridBill;
    const paybackYears = calculatePaybackYears(cost, monthlySavings);
    const batteryKWh = parseFloat((requiredKW * 4).toFixed(2));
    const num150AhBatteries = Math.ceil((batteryKWh * 1000) / (12 * 150));
    const areaComment = availableArea
      ? area > availableArea
        ? "⚠️ Area insufficient"
        : "✅ Area sufficient"
      : "";

    const newResults: Results = {
      requiredKW,
      area,
      cost,
      monthlyGridBill,
      monthlySavings,
      paybackYears,
      batteryKWh,
      num150AhBatteries,
      areaComment,
      initialSolarCost: cost
    };
    setResults(newResults);
    setChartUrl(generateChartUrl(newResults));
  };

  const estimateFromAppliances = (appliances: Appliance[]): void => {
    if (!appliances || appliances.length === 0) {
      alert("Please select or enter appliances.");
      return;
    }
    const totalWhPerMonth = appliances.reduce(
      (total, item) =>
        total + (item.power || 0) * (item.hoursPerDay || 0) * (item.daysPerMonth || 0),
      0
    );
    const units = totalWhPerMonth / 1000;
    setMonthlyUnits(units.toFixed(2));
    estimateFromMonthlyUnits(units);
  };

  const handleFormSubmit = async (): Promise<void> => {
    if (!contact.email) {
      alert("Please enter your email.");
      return;
    }
    if (results.requiredKW <= 0) {
      alert("Please perform an estimation first.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Sun4sure - Solar Estimation Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Name: ${contact.name}`, 20, 30);
    doc.text(`Email: ${contact.email}`, 20, 36);
    doc.text(`System Size: ${results.requiredKW} kW`, 20, 42);
    doc.text(`Area Needed: ${results.area} m²`, 20, 48);
    doc.text(`Area Comment: ${results.areaComment}`, 20, 54);
    doc.text(`Estimated Cost: ₹${results.cost}`, 20, 60);
    doc.text(`Monthly Grid Bill: ₹${results.monthlyGridBill}`, 20, 66);
    doc.text(`Monthly Savings: ₹${results.monthlySavings}`, 20, 72);
    doc.text(`Payback Time: ${results.paybackYears} years`, 20, 78);
    doc.text(`Battery Size: ${results.batteryKWh} kWh`, 20, 84);
    doc.text(`150Ah Batteries: ${results.num150AhBatteries}`, 20, 90);

    doc.textWithLink("View Cost Comparison Chart", 20, 105, {
      url: chartUrl
    });

    doc.save("Sun4sure_Estimate.pdf");

    const formData = new FormData();
    formData.append("service_id", "service_3mv22l7");
    formData.append("template_id", "template_6akl9cj");
    formData.append("user_id", "1oTdBpMY6QyVzde-e");

    formData.append("to_name", contact.name);
    formData.append("to_email", contact.email);

    formData.append("requiredKW", results.requiredKW.toString());
    formData.append("area", results.area.toString());
    formData.append("areaComment", results.areaComment || "");
    formData.append("cost", results.cost.toString());
    formData.append("monthlyGridBill", results.monthlyGridBill.toString());
    formData.append("monthlySavings", results.monthlySavings.toString());
    formData.append("paybackYears", results.paybackYears.toString());
    formData.append("batteryKWh", results.batteryKWh.toString());
    formData.append("num150AhBatteries", results.num150AhBatteries.toString());
    formData.append("location", `${location.lat ?? "N/A"}, ${location.lon ?? "N/A"}`);
    formData.append("sunHours", sunHours.toString());
    formData.append(
      "message",
      `
Hello ${contact.name},

Here is your solar estimation summary:

📐 System Size: ${results.requiredKW || 0} kW
📏 Area Needed: ${results.area || 0} m²
📌 Area Comment: ${results.areaComment || ""}
💰 Estimated Cost: ₹${results.cost || 0}
⚡ Monthly Grid Bill: ₹${results.monthlyGridBill || 0}
✅ Monthly Savings: ₹${results.monthlySavings || 0}
⏳ Payback Period: ${results.paybackYears || 0} years
🔋 Battery Size Needed: ${results.batteryKWh || 0} kWh
🔌 150Ah Batteries Needed: ${results.num150AhBatteries || 0}

📍 Location: ${location.lat ?? "N/A"}, ${location.lon ?? "N/A"}
☀️ Sun Hours Used: ${sunHours || 0} hours/day

Thank you for using Sun4sure!
`
    );

    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send-form", {
        method: "POST",
        body: formData
      });

      await fetch(
        "https://script.google.com/macros/s/AKfycbx6fC5cYAY4UQeYrw_qFF-fWjmlYKJ65enBRBg0bUGebR_XTwRH-qdu1_ITxV9Zj95b_w/exec/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...contact, location, sunHours, results })
        }
      );

      alert("Report sent successfully! Installer also notified.");
    } catch (error) {
      alert("Failed to send report. Please try again later.");
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="p-4 bg-white rounded shadow mb-6">
        <h1 className="text-2xl font-bold mb-4">☀️ Sun4sure - Smart Solar Estimator</h1>

        <div className="flex gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded ${
              mode === "Monthly" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setMode("Monthly")}
          >
            Monthly Mode
          </button>
          <button
            className={`px-4 py-2 rounded ${
              mode === "Appliance" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setMode("Appliance")}
          >
            Appliance Mode
          </button>
        </div>

        {mode === "Monthly" ? (
          <div>
            <label className="block mb-1 font-semibold">Monthly Units (kWh):</label>
            <input
              type="number"
              min="0"
              value={monthlyUnits}
              onChange={(e) => {
                const val = e.target.value;
                setMonthlyUnits(val);
              }}
              className="border p-2 w-full mb-4"
              placeholder="e.g. 300"
            />
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => estimateFromMonthlyUnits(parseFloat(monthlyUnits))}
            >
              Estimate
            </button>
          </div>
        ) : (
          <div>
            <label className="block mb-1 font-semibold">Select Preset:</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="border p-2 w-full mb-4"
            >
              {Object.keys(presets).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => estimateFromAppliances(presets[selectedPreset])}
            >
              Estimate
            </button>
          </div>
        )}

        <div className="mt-6">
          <label className="block font-semibold">☀️ Sun Hours/Day:</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={sunHours}
            onChange={(e) => setSunHours(parseFloat(e.target.value) || 0)}
            className="border p-2 w-full mb-2"
          />
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded"
            onClick={handleGetLocation}
          >
            📍 Get My Location
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold">💰 Grid Rate (₹/unit):</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={gridRate}
              onChange={(e) => setGridRate(parseFloat(e.target.value) || 0)}
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block font-semibold">📉 Degradation Rate (%/yr):</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={degradationRate}
              onChange={(e) => setDegradationRate(parseFloat(e.target.value) || 0)}
              className="border p-2 w-full"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block font-semibold">📏 Available Area (sq.m):</label>
          <input
            type="number"
            min="0"
            value={availableArea}
            onChange={(e) => setAvailableArea(parseFloat(e.target.value) || 0)}
            className="border p-2 w-full"
          />
        </div>
      </div>

      {results.requiredKW > 0 && (
        <>
          <div className="p-4 bg-green-100 rounded shadow mb-6">
            <h2 className="text-lg font-bold mb-2">📊 Estimation Result</h2>
            <p>
              <strong>Required System:</strong> {results.requiredKW} kW
            </p>
            <p>
              <strong>Area Needed:</strong> {results.area} m² {results.areaComment}
            </p>
            <p>
              <strong>Estimated Cost:</strong> ₹{results.cost}
            </p>
            <p>
              <strong>Monthly Grid Bill:</strong> ₹{results.monthlyGridBill}
            </p>
            <p>
              <strong>Monthly Savings:</strong> ₹{results.monthlySavings}
            </p>
            <p>
              <strong>Payback Time:</strong> {results.paybackYears} years
            </p>
            <p>
              <strong>Battery Size Needed:</strong> {results.batteryKWh} kWh
            </p>
            <p>
              <strong>150Ah Batteries:</strong> {results.num150AhBatteries}
            </p>
          </div>

          {chartUrl && (
            <div className="mt-6 p-4 bg-white rounded shadow">
              <h3 className="text-lg font-bold mb-2">📈 25-Year Cost Comparison</h3>
              <img
                src={chartUrl}
                alt="Cost Comparison Chart"
                className="w-full border"
              />
              <p className="text-sm text-gray-600 mt-2">
                Note: Payback year is marked with a vertical blue line.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h2 className="text-xl font-semibold mb-2">📩 Contact Details</h2>
            <input
              type="text"
              placeholder="Name"
              className="border p-1 mb-2 block w-full"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="border p-1 mb-2 block w-full"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Phone"
              className="border p-1 mb-2 block w-full"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />

            <label className="block font-semibold">Select Installer:</label>
            <select
              className="border p-1 rounded w-full"
              value={selectedInstaller}
              onChange={(e) => setSelectedInstaller(e.target.value)}
            >
              {installersList.map((installer) => (
                <option key={installer.name} value={installer.name}>
                  {installer.name}
                </option>
              ))}
            </select>

            <button
              className="mt-3 bg-purple-600 text-white px-4 py-2 rounded"
              onClick={handleFormSubmit}
            >
              Submit & Email Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}


