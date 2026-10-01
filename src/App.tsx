import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { Navbar } from '@/sections/Navbar';
import { Hero } from '@/sections/Hero';
import { Features } from '@/sections/Features';
import { Developers } from '@/sections/Developers';
import { TokenBenefits } from '@/sections/TokenBenefits';
import { Team } from '@/sections/Team';
import { Footer } from '@/sections/Footer';
import { StatusPage } from '@/sections/StatusPage';

function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <Features />
        <Developers />
        <TokenBenefits />
        <Team />
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
            <Route path="/status" element={<StatusPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
