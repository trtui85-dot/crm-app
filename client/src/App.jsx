import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Companies from './pages/Companies.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Activities from './pages/Activities.jsx';
import Settings from './pages/Settings.jsx';
import Users from './pages/Users.jsx';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PermRoute({ page, children }) {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return children;
  if (!user?.permissions?.[page]) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<PermRoute page="dashboard"><Dashboard /></PermRoute>} />
        <Route path="contacts" element={<PermRoute page="contacts"><Contacts /></PermRoute>} />
        <Route path="contacts/:id" element={<PermRoute page="contacts"><ContactDetail /></PermRoute>} />
        <Route path="companies" element={<PermRoute page="companies"><Companies /></PermRoute>} />
        <Route path="companies/:id" element={<PermRoute page="companies"><ContactDetail /></PermRoute>} />
        <Route path="pipeline" element={<PermRoute page="pipeline"><Pipeline /></PermRoute>} />
        <Route path="activities" element={<PermRoute page="activities"><Activities /></PermRoute>} />
        <Route path="settings" element={<PermRoute page="settings"><Settings /></PermRoute>} />
        <Route path="users" element={<PermRoute page="settings"><Users /></PermRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
