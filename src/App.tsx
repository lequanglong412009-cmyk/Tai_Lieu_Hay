import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Home } from './pages/Home';
import { DocumentDetail } from './pages/DocumentDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { CourseDetail } from './pages/CourseDetail';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { InAppBrowserBanner } from './components/layout/InAppBrowserBanner';


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <InAppBrowserBanner />
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
              <Route path="/course/:id" element={<CourseDetail />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/profile" element={<Profile />} />
              {/* Fallback */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
