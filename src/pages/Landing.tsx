import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pill, ShoppingCart, BarChart3, Users, Shield, Smartphone,
  Check, Download, Star, FileBarChart, Bot, Building2, Menu,
} from "lucide-react";
import { useState } from "react";
import heroImg from "@/assets/landing-hero.jpg";

const features = [
  { icon: Pill, title: "Inventory Management", desc: "Medicine stock, batch & expiry tracking with auto-deduction." },
  { icon: ShoppingCart, title: "GST Billing & POS", desc: "Fast billing with GST invoice, print & WhatsApp share." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Sales, GST, daily cash, P&L and supplier ledger reports." },
  { icon: Users, title: "Customer & Udhaar", desc: "Customer profiles, purchase history and credit management." },
  { icon: Building2, title: "Multi-Branch", desc: "Manage multiple pharmacy branches from one dashboard." },
  { icon: Bot, title: "AI Assistant", desc: "Hindi/English AI for forecasting, expiry alerts and queries." },
  { icon: Shield, title: "Role-Based Access", desc: "Admin, Manager, Staff & Cashier roles with secure access." },
  { icon: FileBarChart, title: "Purchase & GRN", desc: "Supplier management, purchase orders and goods receipt." },
];

const plans = [
  { name: "Silver", price: "₹0", period: "Free Forever", features: ["1 Branch", "Up to 100 medicines", "Basic billing", "Email support"], cta: "Start Free" },
  { name: "Gold", price: "₹499", period: "per month", popular: true, features: ["3 Branches", "Unlimited medicines", "GST billing & reports", "WhatsApp share", "Priority support"], cta: "Get Gold" },
  { name: "Platinum", price: "₹999", period: "per month", features: ["Unlimited branches", "All Gold features", "AI assistant", "Custom reports", "24/7 support"], cta: "Get Platinum" },
];

const testimonials = [
  { name: "Rajesh Sharma", role: "Pharmacy Owner, Delhi", text: "Medi Inventory software ne mera business 2x kar diya. Billing aur stock dono easy ho gaye." },
  { name: "Priya Patel", role: "Medical Store, Ahmedabad", text: "GST reports automatic ban jaate hain. CA ko file dena ab seconds ka kaam hai." },
  { name: "Mohammed Khan", role: "Chain Pharmacy, Mumbai", text: "Multi-branch feature kamaal ka hai. Saari branches ek dashboard se control hoti hain." },
];

const faqs = [
  { q: "Kya yeh software free hai?", a: "Haan, Silver plan bilkul free hai. Aap upgrade kabhi bhi kar sakte hain." },
  { q: "Kya desktop pe install ho sakta hai?", a: "Haan, Windows, Mac aur Linux ke liye desktop app available hai. Neeche download karein." },
  { q: "Data safe hai kya?", a: "Bilkul. Aapka data encrypted cloud pe store hota hai with daily backups." },
  { q: "GST billing milti hai?", a: "Haan, full GST compliant invoice with HSN code, CGST/SGST/IGST automatic calculation." },
];

export default function Landing() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Medi Inventory</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#download" className="hover:text-primary transition-colors">Download</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/auth"><Button size="sm">Sign Up Free</Button></Link>
            <button className="md:hidden" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t bg-background px-4 py-3 space-y-2 text-sm">
            <a href="#features" className="block py-1">Features</a>
            <a href="#pricing" className="block py-1">Pricing</a>
            <a href="#download" className="block py-1">Download</a>
            <a href="#faq" className="block py-1">FAQ</a>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto relative px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Trusted by 10,000+ pharmacies in India
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              Pharmacy chalao <span className="text-primary">smart tareeke</span> se
            </h1>
            <p className="text-lg text-muted-foreground">
              Inventory, GST billing, customers, reports aur AI assistant — sab kuch ek hi software me. Hindi & English support ke saath.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg" className="text-base">Start Free Trial</Button></Link>
              <a href="#download"><Button size="lg" variant="outline" className="text-base"><Download className="mr-2 h-4 w-4" />Desktop App</Button></a>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Check className="h-4 w-4 text-primary" />Free forever plan</div>
              <div className="flex items-center gap-1"><Check className="h-4 w-4 text-primary" />No credit card</div>
            </div>
          </div>
          <div className="relative">
            <img src={heroImg} alt="Pharmacy management dashboard" width={1280} height={896} className="rounded-xl shadow-2xl border" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[["10K+","Pharmacies"],["50L+","Bills Generated"],["99.9%","Uptime"],["4.8★","User Rating"]].map(([n,l])=>(
            <div key={l}><div className="text-3xl font-bold text-primary">{n}</div><div className="text-sm text-muted-foreground mt-1">{l}</div></div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Saari features ek jagah</h2>
          <p className="text-muted-foreground mt-3">Pharmacy chalane ke liye jo bhi chahiye, sab milega</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-20 text-center">
          <Smartphone className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold">Desktop pe download karein</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Offline bhi kaam kare, full speed ke saath. Windows, Mac aur Linux ke liye available.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Button size="lg"><Download className="mr-2 h-4 w-4" />Windows (.exe)</Button>
            <Button size="lg" variant="outline"><Download className="mr-2 h-4 w-4" />Mac (.dmg)</Button>
            <Button size="lg" variant="outline"><Download className="mr-2 h-4 w-4" />Linux (.tar.gz)</Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Simple pricing, koi hidden cost nahi</h2>
          <p className="text-muted-foreground mt-3">Free se shuru karein, jab grow karein tab upgrade</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => (
            <Card key={p.name} className={p.popular ? "border-primary shadow-xl relative" : ""}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">Most Popular</div>}
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <div className="mt-2"><span className="text-4xl font-bold">{p.price}</span><span className="text-muted-foreground text-sm ml-2">{p.period}</span></div>
                </div>
                <ul className="space-y-2 text-sm">
                  {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>))}
                </ul>
                <Link to="/auth" className="block"><Button className="w-full" variant={p.popular ? "default" : "outline"}>{p.cta}</Button></Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Customers kya kehte hain</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex">{[...Array(5)].map((_,i)=>(<Star key={i} className="h-4 w-4 fill-primary text-primary" />))}</div>
                  <p className="text-sm">"{t.text}"</p>
                  <div><div className="font-semibold text-sm">{t.name}</div><div className="text-xs text-muted-foreground">{t.role}</div></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-20 max-w-3xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10">Common Questions</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <Card key={f.q}><CardContent className="p-5"><h3 className="font-semibold mb-2">{f.q}</h3><p className="text-sm text-muted-foreground">{f.a}</p></CardContent></Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center space-y-5">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Aaj hi shuruat karein</h2>
            <p className="opacity-90 max-w-xl mx-auto">10,000+ pharmacies join kar chuke hain. Aap kab kar rahe hain?</p>
            <Link to="/auth"><Button size="lg" variant="secondary">Free Account Banayein</Button></Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center"><Pill className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-semibold text-foreground">Medi Inventory</span>
          </div>
          <p>© {new Date().getFullYear()} Medi Inventory. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
