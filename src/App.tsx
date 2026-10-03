import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { Navbar } from '@/sections/Navbar';
import { Hero } from '@/sections/Hero';
import { HowItWorks } from '@/sections/HowItWorks';
import { Features } from '@/sections/Features';
import { Developers } from '@/sections/Developers';
import { TokenBenefits } from '@/sections/TokenBenefits';
import { Footer } from '@/sections/Footer';
import { StatusPage } from '@/sections/StatusPage';
import { AppPage } from '@/pages/AppPage';
import { DocsPage } from '@/pages/DocsPage';

function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Developers />
        <TokenBenefits />
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <div className="min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/app" element={<Navigate to="/app/agent" replace />} />
          <Route path="/app/:slug" element={<AppPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
