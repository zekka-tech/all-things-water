import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { JsonLdOrganization } from "@/components/JsonLd";

const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Shop = lazy(() => import("@/pages/Shop").then((m) => ({ default: m.Shop })));
const ProductDetail = lazy(() => import("@/pages/ProductDetail").then((m) => ({ default: m.ProductDetail })));
const Cart = lazy(() => import("@/pages/Cart").then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import("@/pages/Checkout").then((m) => ({ default: m.Checkout })));
const CheckoutReturn = lazy(() => import("@/pages/CheckoutReturn").then((m) => ({ default: m.CheckoutReturn })));
const CheckoutCancel = lazy(() => import("@/pages/CheckoutCancel").then((m) => ({ default: m.CheckoutCancel })));
const About = lazy(() => import("@/pages/About").then((m) => ({ default: m.About })));
const Contact = lazy(() => import("@/pages/Contact").then((m) => ({ default: m.Contact })));
const Terms = lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })));
const Returns = lazy(() => import("@/pages/Returns").then((m) => ({ default: m.Returns })));
const Admin = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.Admin })));
const Account = lazy(() => import("@/pages/Account").then((m) => ({ default: m.Account })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-600" role="status" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <JsonLdOrganization />
      <ScrollToTop />
      <Layout>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  );
}
