import { Link } from 'react-router-dom'
import { Bulldog, Paw } from './Bulldog'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-stripes" aria-hidden />
      <div className="footer-inner">
        <div className="footer-brandblock">
          <Bulldog pose="sitting" className="footer-dog" />
          <div>
            <p className="footer-brand">Campus Customs</p>
            <p className="footer-cheer">Boola Boola!</p>
            <p>57 Broadway, New Haven, CT 06511</p>
          </div>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/products">
            <Paw className="paw-ico" /> Shop all
          </Link>
          <Link to="/products?category=Hoodies">
            <Paw className="paw-ico" /> Hoodies
          </Link>
          <Link to="/about">
            <Paw className="paw-ico" /> About us
          </Link>
          <Link to="/create-account">
            <Paw className="paw-ico" /> Create account
          </Link>
        </nav>
      </div>
      <p className="footer-note">
        A student class project inspired by Campus Customs. It is not an official store and is not affiliated with
        Yale University. Bulldog illustrations are original artwork.
      </p>
    </footer>
  )
}
