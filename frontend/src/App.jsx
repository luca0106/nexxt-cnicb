import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import ClientsList from './pages/ClientsList';
import DocumentsList from './pages/DocumentsList';
import TasksList from './pages/TasksList';
import HistoryList from './pages/HistoryList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dosare" element={<CasesList />} />
          <Route path="dosare/:id" element={<CaseDetail />} />
          <Route path="clienti" element={<ClientsList />} />
          <Route path="documente" element={<DocumentsList />} />
          <Route path="sarcini" element={<TasksList />} />
          <Route path="istoric" element={<HistoryList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

