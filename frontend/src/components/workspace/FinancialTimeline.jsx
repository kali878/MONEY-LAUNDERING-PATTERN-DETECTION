import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

// Mock data representing a person's transaction history over a month
// This data simulates structured deposits leading up to a large purchase
const mockTransactionData = [
  { date: '2024-11-01', credit: 50000, debit: 15000, label: 'Salary & Expenses' },
  { date: '2024-11-05', credit: 48000, debit: 0, label: 'Cash Deposit' },
  { date: '2024-11-07', credit: 45000, debit: 0, label: 'Cash Deposit' },
  { date: '2024-11-09', credit: 49000, debit: 0, label: 'Cash Deposit' },
  { date: '2024-11-12', credit: 47500, debit: 0, label: 'Cash Deposit' },
  { date: '2024-11-15', credit: 0, debit: 9500000, label: 'Property Purchase' },
  { date: '2024-11-20', credit: 800000, debit: 0, label: 'Transfer from Zenith Global' },
  { date: '2024-11-21', credit: 0, debit: 750000, label: 'Outgoing International Transfer' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-gray-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-lg">
        <p className="text-sm font-bold text-cyan-300">{`Date: ${label}`}</p>
        <p className="text-sm text-gray-300">{`Description: ${data.label}`}</p>
        {data.credit > 0 && <p className="text-sm text-green-400">{`Credit: ₹${data.credit.toLocaleString('en-IN')}`}</p>}
        {data.debit > 0 && <p className="text-sm text-red-400">{`Debit: ₹${data.debit.toLocaleString('en-IN')}`}</p>}
      </div>
    );
  }
  return null;
};

const FinancialTimeline = ({ transactionData = mockTransactionData }) => {
  return (
    <div className="w-full h-[500px] bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-6 animate-fadeIn mt-6">
      <div className="flex items-center mb-4">
        <TrendingUp className="h-6 w-6 text-cyan-300 mr-3" />
        <h2 className="text-xl font-bold text-cyan-300">Financial Transaction Timeline</h2>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={transactionData}
          margin={{
            top: 5, right: 30, left: 20, bottom: 5,
          }}
          barGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <YAxis 
            stroke="#9ca3af" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(value)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 174, 239, 0.1)' }}/>
          <Legend wrapperStyle={{fontSize: "14px"}}/>
          <Bar dataKey="credit" name="Credits (IN)" fill="#10b981" maxBarSize={30} />
          <Bar dataKey="debit" name="Debits (OUT)" fill="#ef4444" maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialTimeline;
