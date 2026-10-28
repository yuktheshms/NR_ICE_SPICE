import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAppContext } from '../contexts/AppContext';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const OrderHistoryPage = () => {
  const { user, orders, setOrders } = useAppContext();
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data.orders || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load orders. Please refresh and try again.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefund = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/refund`, { reason: 'Admin refund request' });
      fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f3ee] p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Records</p>
        <h1 className="text-3xl font-black text-slate-800">Order History</h1>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-soft">
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row">
                <div>
                  <p className="text-lg font-bold text-slate-800">{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{order.customerName || 'Walk-in'} • {order.orderType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Status: {order.orderStatus === 'served' ? 'Delivered' : order.orderStatus}
                    {order.orderStatus === 'served' && order.paymentStatus === 'pending' ? ' · payment due' : ''}
                  </p>
                  <p className="font-black text-slate-800">{formatCurrency(order.total)}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {order.items.map((item) => (
                  <li key={`${order._id}-${item.name}`} className="flex justify-between"><span>{item.name} x {item.quantity}</span><span>{formatCurrency(item.lineTotal)}</span></li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                {order.orderStatus === 'served' && order.paymentStatus === 'pending' && user?.role !== 'kitchen' && (
                  <Link to={`/billing?orderId=${order._id}`} className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
                    Collect cash / netbanking & print bill
                  </Link>
                )}
                {order.paymentStatus === 'paid' && user?.role !== 'kitchen' && (
                  <Link to={`/billing?orderId=${order._id}`} className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white">
                    Print paid bill
                  </Link>
                )}
                {order.orderStatus !== 'served' && order.paymentStatus === 'pending' && (
                  <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Bill available after delivery
                  </span>
                )}
                {user?.role === 'admin' && order.paymentStatus === 'paid' && (
                  <button onClick={() => handleRefund(order._id)} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white">Refund</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryPage;
