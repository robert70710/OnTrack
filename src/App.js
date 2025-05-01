import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

function App() {
    const fields = ['calories', 'steps', 'floors', 'water', 'protein'];
    const goals = {
        calories: 1700,
        steps: 10000,
        floors: 30,
        water: 3000,
        protein: 160,
    };

    const todayKey = () => `ontrack-${new Date().toISOString().slice(0, 10)}`;

    const [inputs, setInputs] = useState(Object.fromEntries(fields.map(f => [f, ''])));
    const [records, setRecords] = useState(Object.fromEntries(fields.map(f => [f, null])));
    const [now, setNow] = useState(new Date());
    const [history, setHistory] = useState([]);

    const start = new Date(); start.setHours(5, 0, 0, 0);
    const end = new Date(); end.setHours(22, 0, 0, 0);
    const nowTime = now.getTime();
    const cappedNow = Math.min(nowTime, end.getTime());
    const totalDuration = end - start;
    const elapsed = Math.max(0, cappedNow - start.getTime());
    const fraction = Math.min(elapsed / totalDuration, 1);
    const remainingHours = Math.max((end - cappedNow) / 1000 / 60 / 60, 1);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem(todayKey());
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.last) setRecords(parsed.last);
            if (parsed.history) setHistory(parsed.history);
        }
    }, []);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        const saved = localStorage.getItem(`ontrack-${selectedDate}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.last) setRecords(parsed.last);
            if (parsed.history) setHistory(parsed.history);
        } else {
            setRecords(Object.fromEntries(fields.map(f => [f, null])));
            setHistory([]);
        }
    }, [selectedDate]);


    const saveUpdate = (updated) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const entry = { time, ...updated };
        const newHistory = [...history, entry];
        setHistory(newHistory);
        localStorage.setItem(todayKey(), JSON.stringify({ last: updated, history: newHistory }));
    };

    const handleChange = (e) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const handleUpdate = () => {
        const updated = {};
        fields.forEach(f => {
            updated[f] = parseFloat(inputs[f]) || 0;
        });
        setRecords(updated);
        saveUpdate(updated);
    };

    const formatTime = (d) =>
        d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

    const formatFutureTime = (fractionValue) => {
        const futureMs = start.getTime() + totalDuration * fractionValue;
        const date = new Date(futureMs);
        return formatTime(date);
    };

    const getStatus = (label) => {
        const current = records[label] ?? 0;
        const goal = goals[label];
        const goalByNow = goal * fraction;
        const isMax = label === 'calories';
        const deviation = isMax
            ? current - goalByNow
            : goalByNow - current;
        const projectedFraction = current / goal;

        let status = '';
        let color = 'green';

        if (isMax) {
            if (current <= goalByNow) {
                const when = projectedFraction < 1 ? formatFutureTime(projectedFraction) : 'After 22:00';
                status = `✅ On track – will exceed at ${when}`;
            } else {
                const when = projectedFraction < 1 ? formatFutureTime(projectedFraction) : 'Never today';
                status = `❌ Over – back on track at ${when}`;
                color = 'red';
            }
        } else {
            if (current >= goalByNow) {
                const when = projectedFraction < 1 ? formatFutureTime(projectedFraction) : 'Goal done';
                status = `✅ On track – will fall behind at ${when}`;
            } else {
                const rate = (goal - current) / remainingHours;
                status = `❌ Behind – need ${rate.toFixed(1)}/hr`;
                color = 'red';
            }
        }

        const progress = Math.min(current / goal, 1);

        return {
            current: current.toFixed(1),
            goal: goal.toFixed(1),
            goalByNow: goalByNow.toFixed(1),
            deviation: deviation.toFixed(1),
            progress: +(progress * 100).toFixed(1),
            color,
            status,
        };
    };
    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center' }}>OnTrack – Daily Tracker</h2>
            <p style={{ textAlign: 'center' }}>Time now: {formatTime(now)}</p>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <label htmlFor="date">Select Date: </label>
                <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>


            {/* Inputs with labels */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 20,
                justifyContent: 'center', marginBottom: 20
            }}>
                {fields.map((field) => (
                    <div key={field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label htmlFor={field} style={{ marginBottom: 5 }}>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                        </label>
                        <input
                            id={field}
                            name={field}
                            type="number"
                            placeholder={field}
                            value={inputs[field]}
                            onChange={handleChange}
                            style={{ padding: 5, width: 100 }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <button onClick={handleUpdate}>Update</button>
            </div>

            {/* Gauges */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 30,
                justifyContent: 'center', marginBottom: 30
            }}>
                {fields.map((field) => {
                    const s = getStatus(field);
                    return (
                        <div key={field} style={{ width: 100, textAlign: 'center' }}>
                            <CircularProgressbar
                                value={s.progress}
                                text={`${s.progress.toFixed(0)}%`}
                                styles={buildStyles({
                                    textSize: '20px',
                                    pathColor: s.color,
                                    textColor: s.color,
                                    trailColor: '#eee',
                                })}
                            />
                            <div style={{ fontSize: 14, marginTop: 5 }}>{field}</div>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', marginBottom: 40 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'center' }}>
                    <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                            <th>Metric</th>
                            <th>Goal</th>
                            <th>Goal by now</th>
                            <th>Current</th>
                            <th>Deviation</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field) => {
                            const s = getStatus(field);
                            return (
                                <tr key={field}>
                                    <td>{field}</td>
                                    <td>{s.goal}</td>
                                    <td>{s.goalByNow}</td>
                                    <td>{s.current}</td>
                                    <td>{s.deviation}</td>
                                    <td style={{ color: s.color }}>{s.status}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Graphs */}
            <h3 style={{ textAlign: 'center' }}>Daily Progress Charts</h3>
            {fields.map((field) => (
                <div key={field} style={{ marginBottom: 50 }}>
                    <h4>{field.charAt(0).toUpperCase() + field.slice(1)}</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={history.map(h => ({ time: h.time, value: h[field] }))}>
                            <XAxis dataKey="time" />
                            <YAxis domain={[0, goals[field]]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#007aff" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ))}
        </div>
    );
}

export default App;
