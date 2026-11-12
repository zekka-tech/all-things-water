import { Suspense, useEffect, useLayoutEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { JsonLdOrganization } from "@/components/JsonLd";
import { captureReferralFromUrl } from "@/lib/referral";
import { routeCommitted } from "@/lib/routeSignal";
import { routes } from "@/routes";

const {
  home: { Component: Home },
  shop: { Component: Shop },
  product: { Component: ProductDetail },
  water: { Component: WaterGuide },
  cart: { Component: Cart },
  checkout: { Component: Checkout },
  checkoutReturn: { Component: CheckoutReturn },
  checkoutCancel: { Component: CheckoutCancel },
  about: { Component: About },
  contact: { Component: Contact },
  business: { Component: Business },
  terms: { Component: Terms },
  privacy: { Component: Privacy },
  returns: { Component: Returns },
  admin: { Component: Admin },
  account: { Component: Account },
  notFound: { Component: NotFound },
} = routes;

/** Lives inside the Suspense boundary, so its layout effect fires when the
 *  page has committed — never for the loading fallback. */
function RouteSignal() {
  const { key } = useLocation();
  useLayoutEffect(() => {
    routeCommitted();
  }, [key]);
  return null;
}

function PageLoading() {
  return (
    // Full height so the footer stays below the fold while the route chunk
    // loads — at 60vh it sat in the viewport and the swap to real content
    // shifted it, which is the page's entire CLS budget in one go.
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-600" role="status" />
    </div>
  );
}

export default function App() {
  // Persist a ?ref=CODE referral once per load; applied at next loyalty fetch.
  useEffect(() => {
    captureReferralFromUrl(window.location.search);
  }, []);

  return (
    <>
      <JsonLdOrganization />
      <ScrollToTop />
      <Layout>
        <Suspense fallback={<PageLoading />}>
          <RouteSignal />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/water" element={<WaterGuide />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/business" element={<Business />} />
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
