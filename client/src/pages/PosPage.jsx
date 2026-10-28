import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, Search, ShoppingCart, Coffee, LogOut, UserCircle2, ReceiptText } from 'lucide-react';
import api from '../services/api';
import { useAppContext } from '../contexts/AppContext';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PosPage = () => {
  const navigate = useNavigate();
  const { user, logout, menu, setMenu, orders } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/menu').then(({ data }) => setMenu(data.items || [])).catch(() => {});
  }, [setMenu]);

  const categories = useMemo(() => {
    const allNames = [...new Set(menu.map((item) => item.categoryName || 'General'))];
    return allNames;
  }, [menu]);

  const filteredItems = menu.filter((item) => {
    const inCategory = selectedCategory === 'all' || item.categoryName === selectedCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return inCategory && matchesSearch && item.isAvailable;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = 0;
  const total = Number((subtotal - discount).toFixed(2));

  const addItem = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.itemId === item._id);
      if (existing) {
        return current.map((entry) => (entry.itemId === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...current, { itemId: item._id, name: item.name, price: item.price, quantity: 1, specialInstructions: '' }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart((current) =>
      current
        .map((entry) => (entry.itemId === itemId ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  };

  const removeItem = (itemId) => setCart((current) => current.filter((entry) => entry.itemId !== itemId));

  const handleSubmitOrder = async () => {
    if (!cart.length) {
      setStatus('Please add at least one item before placing the order.');
      return;
    }

    setSaving(true);
    setStatus('');

    try {
      const payload = {
        orderType,
        tableNumber: orderType === 'dine-in' ? Number(tableNumber) : null,
        customerName,
        customerPhone,
        specialInstructions,
        discount,
        items: cart.map((item) => ({ itemId: item.itemId, quantity: item.quantity, specialInstructions: item.specialInstructions })),
      };

      const response = await api.post('/orders', payload);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSpecialInstructions('');
      setStatus(`Order ${response.data.order.orderNumber} created successfully.`);
      navigate('/orders');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const userBadge = user ? `${user.name} • ${user.role}` : 'Staff';
  const readyToBillCount = orders.filter(
    (order) => order.orderStatus === 'served' && order.paymentStatus === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-[#fff7f0] p-4 md:p-6">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-cafe-charcoal p-5 text-white shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-brand-500 p-3"><Coffee size={26} /></div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Cafe POS</p>
            <h1 className="text-2xl font-black">NR_ICE_SPICE</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(user?.role === 'cashier' || user?.role === 'admin') && (
            <Link
              to="/billing"
              className="relative inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-900/20 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <ReceiptText size={19} />
              <span>Billing</span>
              {readyToBillCount > 0 && (
                <span className="min-w-6 rounded-full bg-white px-2 py-0.5 text-center text-xs font-black text-brand-700">
                  {readyToBillCount}
                </span>
              )}
            </Link>
          )}
          <div className="rounded-full bg-white/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-2"><UserCircle2 size={16} /> {userBadge}</span>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`rounded-xl px-3 py-2 text-sm font-medium ${selectedCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSelectedCategory('all')}>All</button>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${selectedCategory === category ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <div key={item._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1">
                <img src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'} alt={item.name} className="h-36 w-full object-cover" />
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-brand-600">{item.categoryName}</p>
                      <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-sm font-bold text-brand-700">{formatCurrency(item.price)}</span>
                  </div>
                  <p className="mb-4 line-clamp-3 text-sm text-slate-500">{item.description}</p>
                  <button onClick={() => addItem(item)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cafe-charcoal px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                    <Plus size={16} /> Add to order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current order</p>
              <h2 className="text-2xl font-black">Cart</h2>
            </div>
            <div className="rounded-xl bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-700">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${orderType === 'dine-in' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setOrderType('dine-in')}>Dine-in</button>
            <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${orderType === 'takeaway' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setOrderType('takeaway')}>Takeaway</button>
          </div>

          {orderType === 'dine-in' && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Table number</label>
              <input type="number" min="1" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none" />
            </div>
          )}

          <div className="mb-4 space-y-3">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none" />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number (optional)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none" />
            <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows="3" placeholder="Special instructions..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none" />
          </div>

          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Add a few items to begin the order.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.itemId} className="rounded-2xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{item.name}</h3>
                      <p className="text-sm text-slate-500">{formatCurrency(item.price)} each</p>
                    </div>
                    <button onClick={() => removeItem(item.itemId)} className="text-red-500"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                      <button className="rounded-lg p-2 hover:bg-white" onClick={() => updateQty(item.itemId, -1)}><Minus size={15} /></button>
                      <span className="min-w-7 text-center text-sm font-semibold">{item.quantity}</span>
                      <button className="rounded-lg p-2 hover:bg-white" onClick={() => updateQty(item.itemId, 1)}><Plus size={15} /></button>
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(item.quantity * item.price)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-lg font-black text-slate-800"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={saving || cart.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingCart size={18} /> {saving ? 'Placing...' : 'Place order'}
          </button>

          {status && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{status}</div>}
        </aside>
      </div>
    </div>
  );
};

export default PosPage;
