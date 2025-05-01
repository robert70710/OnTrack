// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const metricsList = [
  { key: 'calories', goal: 1700, type: 'max' },
  { key: 'steps', goal: 10000, type: 'min' },
  { key: 'floors', goal: 30, type: 'min' },
  { key: 'water', goal: 3000, type: 'min' },
  { key: 'protein', goal: 160, type: 'min' },
];

function App() {
  const now = new Date();
  const [time, setTime] = useState(now);
  const [selectedDate, setSelectedDate] = useState(() => now.toISOString().slice(0, 10));
  const [records, setRecords] = useState({});
  const [history, setHistory] = useState([]);

  const todayKey = selectedDate;

  useEffect(() => {
    const saved = localStorage.getItem(`ontrack-${todayKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.last) setRecords(parsed.last);
      if (parsed.history) setHistory(parsed.history);
    } else {
      setRecords(Object.fromEntries(metricsList.map(m => [m.key, null])));
      setHistory([]);
    }
  }, [todayKey]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 200);
    return () => clearInterval(interval);
  }, []);

  const saveUpdate = (updated) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { time, ...updated };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    localStorage.setItem(todayKey, JSON.stringify({ last: updated, history: newHistory }));
  };

  const handleChange = (metric, value) => {
    const updated = { ...records, [metric]: Number(value) };
    setRecords(updated);
    saveUpdate(updated);
  };

  const totalSeconds = 17 * 3600; // From 5:00 to 22:00
  const secondsPassed = (time.getHours() - 5) * 3600 + time.getMinutes() * 60 + time.getSeconds();
  const progress = Math.min(secondsPassed / totalSeconds, 1);

  const formatNumber = (num) => Number(num).toFixed(1);

  const renderTable = () => {
    return (
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Goal</th>
            <th>Goal by now</th>
            <th>Current</th>
            <th>Deviation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {metricsList.map(({ key, goal, type }) => {
            const current = records[key] || 0;
            const goalByNow = formatNumber(goal * progress);
            const deviation = formatNumber(type === 'max' ? current - goalByNow : goalByNow - current);
            const timeLeft = (22 - time.getHours()) + (60 - time.getMinutes()) / 60;
            const rate = formatNumber((goal - current) / timeLeft);
            const status = type === 'max'
              ? (current > goal ? `Over limit` : `Will exceed at ${(goal - current) / (current / secondsPassed) / 3600 + 5}`)
              : (current >= goalByNow ? `On track` : `Need ${rate}/hr`);

            return (
              <tr key={key}>
                <td>{key}</td>
                <td>{goal}</td>
                <td>{goalByNow}</td>
                <td>{formatNumber(current)}</td>
                <td>{deviation}</td>
                <td style={{ color: status.includes('Over') || status.includes('Need') ? 'red' : 'green' }}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderCharts = () => {
    return metricsList.map(({ key, goal }) => {
      const labels = history.map(h => h.time);
      const data = history.map(h => h[key] || 0);
      return (
        <div key={key} style={{ width: '100%', maxWidth: 500, marginBottom: 20 }}>
          <h4>{key}</h4>
          <Line data={{
            labels,
            datasets: [{
              label: `${key} progress`,
              data,
              borderColor: 'blue',
              fill: false,
            }]
          }} />
        </div>
      );
    });
  };

  return (
    <div className="App">
      <h1>OnTrack – Real-Time Dashboard</h1>
      <p>Time now: {time.toLocaleTimeString()}</p>
      <label>Select date: <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></label>
      <div>
        {metricsList.map(({ key }) => (
          <div key={key}>
            <label>{key}: </label>
            <input
              type="number"
              value={records[key] || ''}
              onChange={e => handleChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <hr />
      {renderTable()}
      <hr />
      {renderCharts()}
    </div>
  );
}

export default App;
