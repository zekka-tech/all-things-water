import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { JsonLdOrganization } from "@/components/JsonLd";
import { Home } from "@/pages/Home";
import { Shop } from "@/pages/Shop";
import { ProductDetail } from "@/pages/ProductDetail";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { About } from "@/pages/About";
import { Contact } from "@/pages/Contact";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { Returns } from "@/pages/Returns";
import { Admin } from "@/pages/Admin";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  return (
    <>
      <JsonLdOrganization />
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </>
  );
}
