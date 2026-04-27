import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Printer, Receipt, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

interface PharmacySettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  email: string;
  tagline: string;
  footer_note: string;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  gstRate: number;
  hsnCode: string;
  cgst: number;
  sgst: number;
}

interface SaleResult {
  invoiceNumber: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  doctorName: string;
  totalAmount: number;
  discount: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
  netAmount: number;
  paymentMethod: string;
  date: string;
  branchName: string;
  soldBy: string;
}

const DEFAULT_SETTINGS: PharmacySettings = {
  name: "Sharma Pharmacy",
  address: "",
  phone: "",
  gstin: "",
  email: "",
  tagline: "Your Trusted Health Partner",
  footer_note: "Thank you for your visit. Get well soon!",
};

export default function SellMedicinePage() {
  const { user, profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_SETTINGS);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [billDialog, setBillDialog] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: meds }, { data: brs }, { data: ps }] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("branches").select("*").eq("is_active", true),
      supabase.from("pharmacy_settings").select("*").limit(1).maybeSingle(),
    ]);
    setMedicines(meds ?? []);
    setBranches(brs ?? []);
    if (ps) setSettings(ps as PharmacySettings);
    if (brs && brs.length > 0 && !selectedBranch) {
      setSelectedBranch(brs[0].id);
    }
    setLoading(false);
  };

  const filteredMedicines = medicines.filter(m =>
    m.branch_id === selectedBranch &&
    m.quantity > 0 &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
     m.batch_number.toLowerCase().includes(search.toLowerCase()))
  );

  const buildCartItem = (medicine: Medicine, qty: number, unitPrice: number): CartItem => {
    const gstRate = Number(medicine.gst_rate ?? 12);
    const totalPrice = qty * unitPrice;
    // GST inclusive in price -> extract
    const taxable = totalPrice / (1 + gstRate / 100);
    const gstAmt = totalPrice - taxable;
    return {
      medicine,
      quantity: qty,
      unitPrice,
      totalPrice,
      gstRate,
      hsnCode: medicine.hsn_code ?? "",
      cgst: gstAmt / 2,
      sgst: gstAmt / 2,
    };
  };

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(c => c.medicine.id === medicine.id);
    if (existing) {
      if (existing.quantity >= medicine.quantity) {
        toast.error("Stock में इतनी quantity नहीं है!");
        return;
      }
      setCart(cart.map(c =>
        c.medicine.id === medicine.id
          ? buildCartItem(c.medicine, c.quantity + 1, c.unitPrice)
          : c
      ));
    } else {
      setCart([...cart, buildCartItem(medicine, 1, Number(medicine.price))]);
    }
  };

  const updateCartQty = (medicineId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.medicine.id !== medicineId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.medicine.quantity) {
        toast.error("Stock limit exceeded!");
        return c;
      }
      return buildCartItem(c.medicine, newQty, c.unitPrice);
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(c => c.medicine.id !== medicineId));
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.totalPrice, 0);
  const totalCgst = cart.reduce((sum, c) => sum + c.cgst, 0);
  const totalSgst = cart.reduce((sum, c) => sum + c.sgst, 0);
  const totalGst = totalCgst + totalSgst;
  const taxableAmount = totalAmount - totalGst;
  const discountAmount = Number(discount) || 0;
  const netAmount = totalAmount - discountAmount;

  const handleSell = async () => {
    if (!user || cart.length === 0 || !selectedBranch) {
      toast.error("Cart खाली है या branch select नहीं है!");
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        invoice_number: invoiceNumber,
        branch_id: selectedBranch,
        sold_by: user.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        doctor_name: doctorName,
        total_amount: totalAmount,
        discount: discountAmount,
        net_amount: netAmount,
        payment_method: paymentMethod,
        cgst: totalCgst,
        sgst: totalSgst,
        gst_amount: totalGst,
      } as any).select().single();

      if (saleError) throw saleError;

      const saleItems = cart.map(c => ({
        sale_id: (sale as any).id,
        medicine_id: c.medicine.id,
        medicine_name: c.medicine.name,
        quantity: c.quantity,
        unit_price: c.unitPrice,
        total_price: c.totalPrice,
        gst_rate: c.gstRate,
        hsn_code: c.hsnCode,
        cgst: c.cgst,
        sgst: c.sgst,
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems as any);
      if (itemsError) throw itemsError;

      for (const item of cart) {
        const newQty = item.medicine.quantity - item.quantity;
        await supabase.from("medicines").update({ quantity: newQty }).eq("id", item.medicine.id);
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "medicine_sold",
        entity_type: "sale",
        entity_id: (sale as any).id,
        details: { invoice: invoiceNumber, items: cart.length, total: netAmount },
      });

      const branchName = branches.find(b => b.id === selectedBranch)?.name || "";

      setSaleResult({
        invoiceNumber,
        items: [...cart],
        customerName,
        customerPhone,
        doctorName,
        totalAmount,
        discount: discountAmount,
        cgst: totalCgst,
        sgst: totalSgst,
        gstAmount: totalGst,
        netAmount,
        paymentMethod,
        date: new Date().toLocaleString("en-IN"),
        branchName,
        soldBy: profile?.full_name || "User",
      });

      setBillDialog(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDoctorName("");
      setDiscount("0");
      fetchData();
      toast.success("Sale completed! GST bill generated.");
    } catch (err: any) {
      toast.error(err.message || "Sale failed!");
    } finally {
      setSubmitting(false);
    }
  };

  const buildWhatsAppText = () => {
    if (!saleResult) return "";
    const items = saleResult.items.map(i =>
      `${i.medicine.name} x${i.quantity} = ₹${i.totalPrice.toFixed(2)}`
    ).join("\n");
    return `🧾 *${settings.name}* - GST Invoice\n${settings.gstin ? `GSTIN: ${settings.gstin}\n` : ""}📄 ${saleResult.invoiceNumber}\n📅 ${saleResult.date}\n🏪 ${saleResult.branchName}${saleResult.doctorName ? `\n👨‍⚕️ Dr. ${saleResult.doctorName}` : ""}\n\n*Items:*\n${items}\n\n💰 Subtotal: ₹${(saleResult.totalAmount - saleResult.gstAmount).toFixed(2)}\n📊 CGST: ₹${saleResult.cgst.toFixed(2)}\n📊 SGST: ₹${saleResult.sgst.toFixed(2)}${saleResult.discount > 0 ? `\n🎁 Discount: -₹${saleResult.discount.toFixed(2)}` : ""}\n✅ *Total: ₹${saleResult.netAmount.toFixed(2)}*\n💳 Payment: ${saleResult.paymentMethod.toUpperCase()}\n\n${settings.footer_note}`;
  };

  const handleWhatsAppShare = () => {
    if (!saleResult) return;
    const phone = (saleResult.customerPhone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Customer phone number nahi hai!");
      return;
    }
    const phoneNum = phone.startsWith("91") ? phone : `91${phone}`;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(buildWhatsAppText())}`, "_blank");
  };

  const handlePrint = () => {
    if (!billRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>GST Invoice - ${saleResult?.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; padding: 16px; color: #1a1a1a; }
            .bill { max-width: 420px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header .tag { font-size: 11px; color: #555; font-style: italic; margin-top: 2px; }
            .header .addr { font-size: 11px; color: #333; margin-top: 4px; line-height: 1.4; }
            .header .gst-title { display: inline-block; margin-top: 6px; padding: 2px 10px; border: 1px solid #000; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
            .info { font-size: 12px; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; font-weight: 700; background: #f5f5f5; }
            td { padding: 4px 2px; border-bottom: 1px dashed #ccc; }
            .totals { border-top: 2px solid #000; padding-top: 8px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .net { font-weight: 800; font-size: 15px; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
            .footer { text-align: center; margin-top: 14px; font-size: 10px; color: #555; border-top: 2px dashed #999; padding-top: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${billRef.current.innerHTML}
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Sell Medicine</h1>
            <p className="text-sm text-muted-foreground">GST-compliant billing with print & WhatsApp share</p>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{cart.length} items in cart</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Medicine Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Medicines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medicine name or batch..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="max-h-[350px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMedicines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {selectedBranch ? "No medicines found" : "Select a branch first"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMedicines.map(med => (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{med.batch_number}</TableCell>
                            <TableCell className="text-right">₹{Number(med.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{Number(med.gst_rate ?? 12)}%</TableCell>
                            <TableCell className="text-right">{med.quantity}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(med)}
                                className="h-7 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Cart & Checkout */}
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cart is empty</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-auto">
                    {cart.map(item => (
                      <div key={item.medicine.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.medicine.name}</p>
                          <p className="text-xs text-muted-foreground">₹{item.unitPrice} × {item.quantity} = ₹{item.totalPrice.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQty(item.medicine.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQty(item.medicine.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.medicine.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer Name</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="h-8 text-sm" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" className="h-8 text-sm" maxLength={15} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Doctor Name (Optional)</Label>
                    <Input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Name" className="h-8 text-sm" maxLength={100} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount (₹)</Label>
                      <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" min="0" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Payment</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="credit">Credit (Udhaar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Taxable</span>
                    <span>₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>CGST</span>
                    <span>₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>SGST</span>
                    <span>₹{totalSgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (incl. GST)</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₹{netAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSell}
                  disabled={cart.length === 0 || submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate GST Bill
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bill Dialog */}
      <Dialog open={billDialog} onOpenChange={setBillDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>GST Invoice Generated</DialogTitle>
            <DialogDescription>Print, save, ya WhatsApp pe share karein.</DialogDescription>
          </DialogHeader>

          {saleResult && (
            <>
              <div ref={billRef}>
                <div className="bill">
                  <div className="header">
                    <h1>{settings.name}</h1>
                    {settings.tagline && <div className="tag">{settings.tagline}</div>}
                    {settings.address && <div className="addr">{settings.address}</div>}
                    {(settings.phone || settings.email) && (
                      <div className="addr">
                        {settings.phone && `📞 ${settings.phone}`}
                        {settings.phone && settings.email && " | "}
                        {settings.email && `✉️ ${settings.email}`}
                      </div>
                    )}
                    {settings.gstin && <div className="addr"><strong>GSTIN:</strong> {settings.gstin}</div>}
                    <div className="gst-title">TAX INVOICE</div>
                  </div>

                  <div className="info">
                    <div className="info-row">
                      <span><strong>Invoice:</strong> {saleResult.invoiceNumber}</span>
                      <span>{saleResult.date}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>Branch:</strong> {saleResult.branchName}</span>
                      <span><strong>Sold by:</strong> {saleResult.soldBy}</span>
                    </div>
                    {saleResult.customerName && (
                      <div className="info-row">
                        <span><strong>Customer:</strong> {saleResult.customerName}</span>
                        {saleResult.customerPhone && <span>{saleResult.customerPhone}</span>}
                      </div>
                    )}
                    {saleResult.doctorName && (
                      <div className="info-row">
                        <span><strong>Doctor:</strong> Dr. {saleResult.doctorName}</span>
                      </div>
                    )}
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>HSN</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th style={{ textAlign: "right" }}>Rate</th>
                        <th style={{ textAlign: "right" }}>GST%</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleResult.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.medicine.name}</td>
                          <td>{item.hsnCode || "-"}</td>
                          <td style={{ textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right" }}>₹{item.unitPrice.toFixed(2)}</td>
                          <td style={{ textAlign: "right" }}>{item.gstRate}%</td>
                          <td style={{ textAlign: "right" }}>₹{item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="totals">
                    <div className="totals-row">
                      <span>Taxable Value</span>
                      <span>₹{(saleResult.totalAmount - saleResult.gstAmount).toFixed(2)}</span>
                    </div>
                    <div className="totals-row">
                      <span>CGST</span>
                      <span>₹{saleResult.cgst.toFixed(2)}</span>
                    </div>
                    <div className="totals-row">
                      <span>SGST</span>
                      <span>₹{saleResult.sgst.toFixed(2)}</span>
                    </div>
                    <div className="totals-row">
                      <span>Subtotal (incl. GST)</span>
                      <span>₹{saleResult.totalAmount.toFixed(2)}</span>
                    </div>
                    {saleResult.discount > 0 && (
                      <div className="totals-row" style={{ color: "green" }}>
                        <span>Discount</span>
                        <span>-₹{saleResult.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="totals-row net">
                      <span>Net Payable</span>
                      <span>₹{saleResult.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="totals-row" style={{ fontSize: "11px", marginTop: "6px" }}>
                      <span>Payment Mode</span>
                      <span style={{ textTransform: "uppercase" }}>{saleResult.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="footer">
                    <p>{settings.footer_note}</p>
                    {settings.gstin && <p style={{ marginTop: "4px" }}>This is a computer-generated GST invoice.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button onClick={handleWhatsAppShare} className="bg-green-600 hover:bg-green-700">
                  <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
