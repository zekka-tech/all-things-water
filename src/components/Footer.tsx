import { Link } from "react-router-dom";
import { Droplets, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Droplets className="h-5 w-5" />
            </span>
            All Things Water
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-500 dark:text-ink-400">
            Premium bottled water, coolers and dispensers — delivered across South Africa.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-brand-600">All products</Link></li>
            <li><Link to="/shop?category=bottled-water" className="hover:text-brand-600">Bottled water</Link></li>
            <li><Link to="/shop?category=coolers" className="hover:text-brand-600">Water coolers</Link></li>
            <li><Link to="/shop?category=accessories" className="hover:text-brand-600">Accessories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Company</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-brand-600">About us</Link></li>
            <li><Link to="/contact" className="hover:text-brand-600">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Get in touch</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500 dark:text-ink-400">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +27 00 000 0000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@allthingswater.co.za</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> South Africa</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-200 py-5 text-center text-xs text-ink-400 dark:border-ink-800">
        © {new Date().getFullYear()} All Things Water. All rights reserved.
      </div>
    </footer>
  );
}
