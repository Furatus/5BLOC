import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="main-navigation">
      <Link to="/roulette" className={`nav-link ${isActive('/roulette')}`}>
        Roulette
      </Link>
      <Link to="/inventory" className={`nav-link ${isActive('/inventory')}`}>
        Inventaire
      </Link>
      <Link to="/trade" className={`nav-link ${isActive('/trade')}`}>
        Trading
      </Link>
    </nav>
  );
}

export default Navigation;