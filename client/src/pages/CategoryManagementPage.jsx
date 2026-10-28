import { useEffect, useState } from 'react';
import api from '../services/api';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    const { data } = await api.get('/categories');
    setCategories(data.categories || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/categories', { name, description });
    setName('');
    setDescription('');
    fetchCategories();
  };

  return (
    <div className="min-h-screen bg-[#fff7f1] p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Admin</p>
        <h1 className="text-3xl font-black text-slate-800">Category Management</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold">Add new category</h2>
          <div className="space-y-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" placeholder="Description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            <button type="submit" className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white">Save category</button>
          </div>
        </form>

        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold">All categories</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <div key={category._id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-lg font-bold text-slate-800">{category.name}</p>
                <p className="mt-1 text-sm text-slate-500">{category.description || 'No description yet.'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementPage;
