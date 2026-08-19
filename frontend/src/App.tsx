import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { PrivateRoute, PublicRoute } from "./components/Guards";
import { Layout } from "./components/Layout";

// Public Home Landing
import { Landing } from "./pages/Landing";

// Onboarding and Registration
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";

// Projects Scope Selector
import { Projects } from "./pages/Projects";

// Private Dashboard Pages
import { Overview } from "./pages/Overview";
import { Customers } from "./pages/Customers";
import { CustomerDetails } from "./pages/CustomerDetails";
import { Accounts } from "./pages/Accounts";
import { AccountDetails } from "./pages/AccountDetails";
import { Transfers } from "./pages/Transfers";
import { TransactionDetails } from "./pages/TransactionDetails";
import { Ledger } from "./pages/Ledger";
import { Webhooks } from "./pages/Webhooks";
import { Logs } from "./pages/Logs";
import { LogDetails } from "./pages/LogDetails";
import { ApiKeys } from "./pages/ApiKeys";
import { Sandbox } from "./pages/Sandbox";
import { Docs } from "./pages/Docs";
import { Settings } from "./pages/Settings";

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Home Landing page */}
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<Docs />} />

          {/* Public Auth routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Workspace level selector */}
          <Route element={<PrivateRoute />}>
            <Route path="/projects" element={<Projects />} />
            
            {/* Private workspace routes nested under Layout container */}
            <Route path="/projects/:projectId" element={<Layout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetails />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="accounts/:id" element={<AccountDetails />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="transfers/:id" element={<TransactionDetails />} />
              <Route path="transactions" element={<Transfers />} />
              <Route path="transactions/:id" element={<TransactionDetails />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="logs" element={<Logs />} />
              <Route path="logs/:requestId" element={<LogDetails />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="sandbox" element={<Sandbox />} />
              <Route path="docs" element={<Docs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback route redirection */}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
