import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { useAppContext } from '../contexts/AppContext';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const BillingPage = () => {
  const { user, settings } = useAppContext();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('orderId') || '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [status, setStatus] = useState('');
  const [shouldPrint, setShouldPrint] = useState(false);
  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === selectedOrderId),
    [orders, selectedOrderId]
  );
  const selectedPayment = useMemo(
    () => payments.find((payment) => (payment.order?._id || payment.order) === selectedOrderId && payment.status === 'confirmed'),
    [payments, selectedOrderId]
  );
  const upiPaymentUri = useMemo(() => {
    if (!selectedOrder || !settings?.upiId) return '';

    const params = new URLSearchParams({
      pa: settings.upiId,
      pn: settings.cafeName || 'NR_ICE_SPICE',
      am: Number(selectedOrder.total).toFixed(2),
      cu: 'INR',
      tn: selectedOrder.orderNumber,
    });
    return `upi://pay?${params.toString()}`;
  }, [selectedOrder, settings]);

  const fetchOrders = async () => {
    const [{ data: orderData }, { data: paymentData }] = await Promise.all([
      api.get('/orders'),
      api.get('/payments'),
    ]);
    setOrders(orderData.orders || []);
    setPayments(paymentData.payments || []);
    if (!selectedOrderId) {
      const firstBillable = (orderData.orders || []).find(
        (order) => order.orderStatus === 'served' && order.paymentStatus === 'pending'
      );
      if (firstBillable) setSelectedOrderId(firstBillable._id);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (shouldPrint && selectedOrder?.paymentStatus === 'paid') {
      window.print();
      setShouldPrint(false);
    }
  }, [shouldPrint, selectedOrder]);

  const handlePayment = async () => {
    if (!selectedOrder) {
      setStatus('Select an order first.');
      return;
    }
    if (selectedOrder.orderStatus !== 'served') {
      setStatus('Payment is available after the order has been served.');
      return;
    }
    if (selectedOrder.paymentStatus !== 'pending') {
      setStatus('This order has no outstanding payment.');
      return;
    }

    try {
      const { data } = await api.post(`/orders/${selectedOrder._id}/payment`, {
        method: paymentMethod,
        amount: Number(selectedOrder.total),
        paymentConfirmed,
        transactionReference,
      });
      setStatus(`Payment received for ${data.order.orderNumber}. Printing the bill...`);
      setOrders((current) => current.map((order) => (order._id === data.order._id ? data.order : order)));
      setPayments((current) => [data.payment, ...current.filter((payment) => payment._id !== data.payment._id)]);
      setShouldPrint(true);
      await fetchOrders();
    } catch (error) {
      setStatus(error.response?.data?.message || 'Payment failed to record.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    try {
      const { data } = await api.post(`/orders/${selectedOrder._id}/refund`, { reason: 'Customer requested refund' });
      setStatus(`Refund processed for ${data.order.orderNumber}.`);
      await fetchOrders();
    } catch (error) {
      setStatus(error.response?.data?.message || 'Refund failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Billing</p>
          <h1 className="text-3xl font-black text-slate-800">Payment & Receipt</h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Ready for billing</h2>
          <div className="space-y-3">
            {orders.filter((order) =>
              (order.orderStatus === 'served' && order.paymentStatus === 'pending') ||
              (order.orderStatus === 'completed' && order.paymentStatus === 'paid')
            ).map((order) => (
              <button
                key={order._id}
                onClick={() => setSelectedOrderId(order._id)}
                className={`w-full rounded-2xl border p-3 text-left ${selectedOrder?._id === order._id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{order.orderNumber}</span>
                  <span className="text-sm font-medium text-slate-500">
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Delivered · Awaiting payment'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{order.customerName || 'Walk-in'} • {order.orderType}</p>
                <p className="mt-1 text-right font-bold text-slate-800">{formatCurrency(order.total)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-soft">
          {selectedOrder ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order</p>
                  <h2 className="text-2xl font-black text-slate-800">{selectedOrder.orderNumber}</h2>
                </div>
                <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-brand-700">
                  {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending'
                    ? 'Delivered · Payment due'
                    : selectedOrder.paymentStatus}
                </div>
              </div>

              {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending' && (
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setPaymentConfirmed(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <option value="cash">Cash</option>
                    <option value="netbanking">Netbanking</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Amount due</label>
                  <input type="text" readOnly value={formatCurrency(selectedOrder.total)} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5" />
                </div>
              </div>
              )}

              {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending' && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Transaction reference</label>
                <input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" placeholder="Bank reference / UPI ID / card auth (optional)" />
              </div>
              )}

              {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending' && paymentMethod !== 'cash' && (
                paymentMethod === 'upi' ? (
                  <div className="mb-4 flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center">
                    {upiPaymentUri ? (
                      <>
                        <QRCodeSVG value={upiPaymentUri} size={220} level="M" includeMargin />
                        <p className="mt-3 font-semibold text-slate-800">Scan to pay {formatCurrency(selectedOrder.total)}</p>
                        <p className="mt-1 text-sm text-slate-600">UPI ID: {settings.upiId}</p>
                        <p className="mt-1 text-xs text-slate-500">Order {selectedOrder.orderNumber} · Confirm receipt before recording payment.</p>
                      </>
                    ) : (
                      <p role="alert" className="text-sm text-red-700">UPI ID is not configured. Contact an administrator.</p>
                    )}
                  </div>
                ) : null
              )}

              {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending' && paymentMethod !== 'cash' && (
                <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} />
                  I verified that this {paymentMethod === 'netbanking' ? 'netbanking' : paymentMethod} payment was received
                </label>
              )}

              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-slate-600"><span>Discount</span><span>{formatCurrency(selectedOrder.discount)}</span></div>
                <div className="mt-3 flex justify-between text-xl font-black text-slate-800"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedOrder.orderStatus === 'served' && selectedOrder.paymentStatus === 'pending' && (
                  <button
                    onClick={handlePayment}
                    disabled={paymentMethod !== 'cash' && !paymentConfirmed}
                    className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Pay & print bill
                  </button>
                )}
                {selectedOrder.paymentStatus === 'paid' && (
                  <button onClick={handlePrint} className="rounded-xl bg-slate-700 px-4 py-3 font-semibold text-white">Reprint paid bill</button>
                )}
                {user?.role === 'admin' && selectedOrder.paymentStatus === 'paid' && (
                  <button onClick={handleRefund} className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white">Refund</button>
                )}
              </div>

              {selectedOrder.orderStatus !== 'served' && selectedOrder.paymentStatus !== 'paid' && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This order is not marked delivered yet. The cashier can take payment after kitchen staff marks it as Served.
                </p>
              )}

              {status && <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{status}</div>}

              <div id="receipt-print" className="receipt print-area mt-6 rounded-2xl border border-dashed border-slate-300 p-4">
                <div className="text-center">
                  <p className="text-lg font-black text-slate-800">NR_ICE_SPICE</p>
                  <p className="text-xs text-slate-500">12 Market Lane, Bengaluru</p>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  <p>Order: {selectedOrder.orderNumber}</p>
                  <p>Bill number: {selectedOrder.orderNumber}</p>
                  <p>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p>Customer: {selectedOrder.customerName || 'Walk-in'}</p>
                </div>
                <div className="mt-4 border-t border-b border-slate-200 py-2">
                  {selectedOrder.items.map((item) => (
                    <div key={`${selectedOrder._id}-${item.name}`} className="mb-2 flex justify-between text-xs text-slate-700">
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
                  <div className="flex justify-between"><span>Payment status</span><span>{selectedOrder.paymentStatus}</span></div>
                  {selectedPayment && <div className="flex justify-between"><span>Paid by</span><span>{selectedPayment.method.toUpperCase()}</span></div>}
                  {selectedPayment && <div className="flex justify-between"><span>Payment number</span><span>{selectedPayment.paymentNumber}</span></div>}
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-500">No order selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
