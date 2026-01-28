
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Order, Product } from '../types';

interface ReportsProps {
  orders: Order[];
  products: Product[];
}

export const Reports: React.FC<ReportsProps> = ({ orders, products }) => {
  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    orders.forEach(order => {
      const product = products.find(p => p.nomi === order.tovar);
      const category = product?.kategoriya || 'Boshqa';
      stats[category] = (stats[category] || 0) + Number(order.jami_summa);
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [orders, products]);

  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    orders.forEach(order => {
      const status = order.holat || 'YANGI';
      stats[status] = (stats[status] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const productPerformance = useMemo(() => {
    const stats: Record<string, number> = {};
    orders.forEach(order => {
      stats[order.tovar] = (stats[order.tovar] || 0) + Number(order.jami_summa);
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tight">Kategoriyalar Ulushi</h3>
          <div className="h-[400px]" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                   formatter={(value: any) => `${Number(value).toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tight">Buyurtmalar Holati</h3>
          <div className="h-[400px]" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[0, 10, 10, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tight">Top 10 Mahsulot (Savdo summasi bo'yicha)</h3>
        <div className="h-[500px]" style={{ minHeight: '500px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productPerformance} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} 
                angle={-45} 
                textAnchor="end"
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} tickFormatter={(val) => `${val/1000000}M`} />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                formatter={(value: any) => `${Number(value).toLocaleString()}`}
              />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                 {productPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#818CF8'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
