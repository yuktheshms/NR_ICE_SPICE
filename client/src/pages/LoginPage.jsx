import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAppContext } from '../contexts/AppContext';
import { Coffee, Lock, User } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAppContext();
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('nr_ice_spice_token', data.token);
      setToken(data.token);
      setUser(data.user);

      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'kitchen') navigate('/kitchen');
      else navigate('/pos');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff8f1] p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-soft lg:grid-cols-2">
        <div className="hidden bg-[radial-gradient(circle_at_top,_#f7b267,_#c2410c)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Coffee size={28} />
            </div>
            <div>
              <p className="text-2xl font-black tracking-wide">NR_ICE_SPICE</p>
              <p className="text-sm text-orange-100">Cafe Management System</p>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-orange-100">Welcome back</p>
            <h1 className="text-4xl font-black leading-tight">Fast, warm, and efficient cafe operations.</h1>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-sm text-orange-100">Demo access</p>
            <p className="mt-2 text-lg font-semibold">admin / admin123</p>
            <p className="text-sm text-orange-100">cashier / cashier123</p>
            <p className="text-sm text-orange-100">kitchen / kitchen123</p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 text-brand-600">
              <Lock size={24} />
            </div>
            <h2 className="text-3xl font-black text-cafe-charcoal">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Secure access for your team</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <User size={18} className="text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent outline-none"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none ring-0"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
