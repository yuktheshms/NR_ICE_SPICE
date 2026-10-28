import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, DollarSign, ClipboardList, Clock3, CheckCircle2, PackageX, TrendingUp, Utensils, Tags } from 'lucide-react';
import api from '../services/api';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: dashboardData }, { data: ordersData }] = await Promise.all([
          api.get('/dashboard'),
          api.get('/orders'),
        ]);
        setStats(dashboardData.stats || {});
        setOrders((ordersData.orders || []).slice(0, 8));
        setPayments(dashboardData.recentTransactions || []);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-xl font-semibold text-slate-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Today sales', value: formatCurrency(stats.totalSales), icon: DollarSign, glow: 'bg-emerald-100 text-emerald-700' },
    { label: 'Orders', value: String(stats.totalOrders || 0), icon: ClipboardList, glow: 'bg-blue-100 text-blue-700' },
    { label: 'Pending', value: String(stats.pendingOrders || 0), icon: Clock3, glow: 'bg-amber-100 text-amber-700' },
    { label: 'Preparing', value: String(stats.preparingOrders || 0), icon: PackageX, glow: 'bg-orange-100 text-orange-700' },
    { label: 'Completed', value: String(stats.completedOrders || 0), icon: CheckCircle2, glow: 'bg-green-100 text-green-700' },
    { label: 'Cancelled', value: String(stats.cancelledOrders || 0), icon: TrendingUp, glow: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f4ef] p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Operations</p>
          <h1 className="text-3xl font-black text-slate-800">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/menu" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700">
            <Utensils size={18} /> Manage menu
          </Link>
          <Link to="/categories" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-slate-700 shadow-soft hover:bg-slate-50">
            <Tags size={18} /> Categories
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, glow }) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className={`rounded-2xl p-3 ${glow}`}><Icon size={22} /></div>
            </div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-slate-700"><BarChart3 /> <h2 className="text-xl font-bold">Recent orders</h2></div>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{order.customerName || 'Walk-in'} • {order.orderStatus}</p>
                </div>
                <span className="font-bold text-slate-800">{formatCurrency(order.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-slate-700"><DollarSign /> <h2 className="text-xl font-bold">Recent transactions</h2></div>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment._id} className="rounded-2xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{payment.method.toUpperCase()}</p>
                <p className="text-sm text-slate-500">{payment.status} • {payment.order?.orderNumber || 'Order'}</p>
                <div className="mt-2 text-right font-bold text-slate-800">{formatCurrency(payment.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
