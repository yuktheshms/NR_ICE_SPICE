import { useEffect, useState } from 'react';
import api from '../services/api';

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  accepted: 'bg-violet-100 text-violet-700',
  preparing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  served: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

const KitchenDashboardPage = () => {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const { data } = await api.get('/orders');
    setOrders((data.orders || []).filter((order) => order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled'));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-600">Operations</p>
        <h1 className="text-3xl font-black text-slate-800">Kitchen Dashboard</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <div key={order._id} className="rounded-3xl bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">#{order.orderNumber}</p>
                <h2 className="text-xl font-black text-slate-800">{order.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway'}</h2>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusColors[order.orderStatus] || 'bg-slate-100 text-slate-700'}`}>{order.orderStatus}</span>
            </div>

            <div className="mb-3 space-y-1 text-sm text-slate-600">
              <p>Table: {order.tableNumber || 'N/A'}</p>
              <p>Customer: {order.customerName || 'Walk-in'}</p>
              <p>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div className="mb-4 space-y-2">
              {order.items.map((item) => (
                <div key={`${order._id}-${item.name}`} className="rounded-xl bg-slate-50 p-2 text-sm">
                  <div className="flex justify-between font-semibold text-slate-800"><span>{item.name}</span><span>x{item.quantity}</span></div>
                  {item.specialInstructions && <p className="text-xs text-slate-500">Note: {item.specialInstructions}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {order.orderStatus === 'new' && <button onClick={() => updateStatus(order._id, 'accepted')} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Accept</button>}
              {order.orderStatus === 'accepted' && <button onClick={() => updateStatus(order._id, 'preparing')} className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white">Preparing</button>}
              {order.orderStatus === 'preparing' && <button onClick={() => updateStatus(order._id, 'ready')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Ready</button>}
              {order.orderStatus === 'ready' && <button onClick={() => updateStatus(order._id, 'served')} className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white">Mark delivered</button>}
              {order.orderStatus !== 'served' && <button onClick={() => updateStatus(order._id, 'cancelled')} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white">Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDashboardPage;
