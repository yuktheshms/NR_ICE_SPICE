import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nr_ice_spice_token') || '');
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({ cafeName: 'NR_ICE_SPICE', taxRate: 0, currency: 'INR' });
  const [socket, setSocket] = useState(null);

  const logout = () => {
    localStorage.removeItem('nr_ice_spice_token');
    setToken('');
    setUser(null);
  };

  useEffect(() => {
    if (!token) return;

    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => logout());
    api.get('/menu').then(({ data }) => setMenu(data.items || [])).catch(() => {});
    api.get('/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => {});
    api.get('/settings').then(({ data }) => setSettings(data.settings || {})).catch(() => {});
    api.get('/orders').then(({ data }) => setOrders(data.orders || [])).catch(() => {});

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (
      import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin
    );
    const socketClient = io(socketUrl, { transports: ['websocket'] });
    socketClient.on('connect', () => {
      socketClient.emit('join-room', 'orders');
    });
    socketClient.on('orders:update', (payload) => {
      if (!payload.order?._id) return;
      setOrders((current) => {
        const exists = current.some((order) => order._id === payload.order?._id);
        if (!exists) return [payload.order, ...current];
        return current.map((order) => (order._id === payload.order?._id ? payload.order : order));
      });
    });
    setSocket(socketClient);

    return () => socketClient.disconnect();
  }, [token]);

  const value = useMemo(() => ({
    user,
    setUser,
    token,
    setToken,
    menu,
    setMenu,
    categories,
    setCategories,
    orders,
    setOrders,
    settings,
    setSettings,
    socket,
    logout,
  }), [user, token, menu, categories, orders, settings, socket]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
