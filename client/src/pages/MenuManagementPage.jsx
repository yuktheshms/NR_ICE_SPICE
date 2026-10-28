import { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  image: '',
  isAvailable: true,
};

const MenuManagementPage = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const [{ data: menuData }, { data: categoryData }] = await Promise.all([
        api.get('/menu'),
        api.get('/categories'),
      ]);
      setItems(menuData.items || []);
      setCategories(categoryData.categories || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load menu items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const price = Number(form.price);
    if (!form.name.trim() || !form.category || !Number.isFinite(price) || price < 0) {
      setError('Enter an item name, select a category, and enter a valid non-negative price.');
      return;
    }

    setSaving(true);
    const payload = { ...form, name: form.name.trim(), price };

    try {
      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
        setMessage('Menu item updated. It will appear on the POS menu after refresh.');
      } else {
        await api.post('/menu', payload);
        setMessage('Menu item added. It will appear on the POS menu after refresh.');
      }

      setForm(initialForm);
      setEditingId(null);
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.msg || 'Could not save this menu item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setError('');
    setMessage('');
    setEditingId(item._id);
    setForm({
      name: item.name,
      description: item.description,
      category: item.category?._id || item.category || '',
      price: String(item.price),
      image: item.image || '',
      isAvailable: item.isAvailable,
    });
  };

  const handleDelete = async (id) => {
    setError('');
    setMessage('');
    try {
      await api.delete(`/menu/${id}`);
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage('Menu item deleted.');
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete this menu item. Please try again.');
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-xl font-semibold text-slate-500">Loading menu...</div>;

  return (
    <div className="min-h-screen bg-[#fdf5ed] p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Admin</p>
        <h1 className="text-3xl font-black text-slate-800">Menu Management</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_2fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold">{editingId ? 'Edit item' : 'Add item'}</h2>
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
          <div className="space-y-4">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" rows="3" />
            <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
            <input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image URL" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /> Available</label>
            <div className="flex gap-3">
              <button disabled={saving} type="submit" className="flex-1 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : editingId ? 'Update item' : 'Save menu item'}</button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                    setError('');
                    setMessage('');
                  }}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold">Menu items</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item._id} className="overflow-hidden rounded-2xl border border-slate-200">
                <img src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'} className="h-32 w-full object-cover" alt={item.name} />
                <div className="p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{item.name}</h3>
                    <span className="text-sm font-semibold text-brand-700">₹{item.price}</span>
                  </div>
                  <p className="text-sm text-slate-500">{item.categoryName}</p>
                  {!item.isAvailable && <p className="mt-1 text-xs font-semibold text-red-600">Unavailable</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => handleEdit(item)} className="rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-700">Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagementPage;
