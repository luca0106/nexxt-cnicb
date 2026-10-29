import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import ClientsList from './pages/ClientsList';
import ClientFinancialProfile from './pages/ClientFinancialProfile';
import DocumentsList from './pages/DocumentsList';
import TasksList from './pages/TasksList';
import { PluginProvider } from './plugin/PluginContext';
import PluginStandalonePage from './plugin/PluginStandalonePage';

export default function App() {
  return (
    <BrowserRouter>
      <PluginProvider>
        <Routes>
          {/* Standalone B2B External AI Plugin Console (Decoupled from BankDesk Host Layout) */}
          <Route path="/plugin" element={<PluginStandalonePage />} />
          <Route path="/plugin/:id" element={<PluginStandalonePage />} />

          {/* BankDesk Core Banking Host Application */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            {/* Primary English routes */}
            <Route path="cases" element={<CasesList />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/:id/finances" element={<ClientFinancialProfile />} />
            <Route path="documents" element={<DocumentsList />} />
            <Route path="tasks" element={<TasksList />} />

            {/* Legacy Romanian redirects */}
            <Route path="dosare" element={<Navigate to="/cases" replace />} />
            <Route path="dosare/:id" element={<CasesListWrapper />} />
            <Route path="clienti" element={<Navigate to="/clients" replace />} />
            <Route path="documente" element={<Navigate to="/documents" replace />} />
            <Route path="sarcini" element={<Navigate to="/tasks" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PluginProvider>
    </BrowserRouter>
  );
}

function CasesListWrapper() {
  return <CaseDetail />;
}
