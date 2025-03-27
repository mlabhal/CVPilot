import { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import AppRoutes from './routes/AppRoutes';
import backgroundImage from './images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';

function App() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen relative"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}>
          <div className="relative z-10">
            <MainLayout 
              isMenuCollapsed={isMenuCollapsed}
              setIsMenuCollapsed={setIsMenuCollapsed}
            >
              <AppRoutes />
            </MainLayout>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;