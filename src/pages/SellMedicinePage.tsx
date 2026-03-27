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
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Printer, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

interface CartItem {
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SaleResult {
  invoiceNumber: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  discount: number;
  netAmount: number;
  paymentMethod: string;
  date: string;
  branchName: string;
  soldBy: string;
}

export default function SellMedicinePage() {
  const { user, profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
    const [{ data: meds }, { data: brs }] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("branches").select("*").eq("is_active", true),
    ]);
    setMedicines(meds ?? []);
    setBranches(brs ?? []);
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

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(c => c.medicine.id === medicine.id);
    if (existing) {
      if (existing.quantity >= medicine.quantity) {
        toast.error("Stock में इतनी quantity नहीं है!");
        return;
      }
      setCart(cart.map(c =>
        c.medicine.id === medicine.id
          ? { ...c, quantity: c.quantity + 1, totalPrice: (c.quantity + 1) * c.unitPrice }
          : c
      ));
    } else {
      setCart([...cart, {
        medicine,
        quantity: 1,
        unitPrice: Number(medicine.price),
        totalPrice: Number(medicine.price),
      }]);
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
      return { ...c, quantity: newQty, totalPrice: newQty * c.unitPrice };
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(c => c.medicine.id !== medicineId));
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.totalPrice, 0);
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

      // Insert sale
      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        invoice_number: invoiceNumber,
        branch_id: selectedBranch,
        sold_by: user.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalAmount,
        discount: discountAmount,
        net_amount: netAmount,
        payment_method: paymentMethod,
      } as any).select().single();

      if (saleError) throw saleError;

      // Insert sale items
      const saleItems = cart.map(c => ({
        sale_id: (sale as any).id,
        medicine_id: c.medicine.id,
        medicine_name: c.medicine.name,
        quantity: c.quantity,
        unit_price: c.unitPrice,
        total_price: c.totalPrice,
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems as any);
      if (itemsError) throw itemsError;

      // Update medicine quantities
      for (const item of cart) {
        const newQty = item.medicine.quantity - item.quantity;
        await supabase.from("medicines").update({ quantity: newQty }).eq("id", item.medicine.id);
      }

      // Log activity
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
        totalAmount,
        discount: discountAmount,
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
      setDiscount("0");
      fetchData();
      toast.success("Sale completed! Bill generated.");

      // Auto-send WhatsApp bill
      if (customerPhone) {
        const phone = customerPhone.replace(/\D/g, "");
        const phoneNum = phone.startsWith("91") ? phone : `91${phone}`;
        const items = [...cart].map(i => `${i.medicine.name} x${i.quantity} = ₹${i.totalPrice.toFixed(2)}`).join("\n");
        const msg = `🧾 *MedInventory Invoice*\n📄 ${invoiceNumber}\n📅 ${new Date().toLocaleString("en-IN")}\n🏪 ${branchName}\n\n*Items:*\n${items}\n\n💰 Subtotal: ₹${totalAmount.toFixed(2)}${discountAmount > 0 ? `\n🎁 Discount: -₹${discountAmount.toFixed(2)}` : ""}\n✅ *Total: ₹${netAmount.toFixed(2)}*\n💳 Payment: ${paymentMethod.toUpperCase()}\n\nThank you! 🙏`;
        window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Sale failed!");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!billRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${saleResult?.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; }
            .bill { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 12px; }
            .header h1 { font-size: 20px; font-weight: 700; }
            .header p { font-size: 11px; color: #666; margin-top: 2px; }
            .info { font-size: 12px; margin-bottom: 12px; }
            .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
            th { text-align: left; border-bottom: 1px solid #333; padding: 4px 2px; font-weight: 600; }
            td { padding: 4px 2px; border-bottom: 1px dashed #ddd; }
            .totals { border-top: 2px dashed #333; padding-top: 8px; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .totals .net { font-weight: 700; font-size: 16px; border-top: 1px solid #333; padding-top: 6px; margin-top: 6px; }
            .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #888; border-top: 2px dashed #333; padding-top: 8px; }
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
            <p className="text-sm text-muted-foreground">Select medicines and generate bill</p>
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
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMedicines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {selectedBranch ? "No medicines found" : "Select a branch first"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMedicines.map(med => (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{med.batch_number}</TableCell>
                            <TableCell className="text-right">₹{Number(med.price).toFixed(2)}</TableCell>
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
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" className="h-8 text-sm" />
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
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
                  Complete Sale & Generate Bill
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
            <DialogTitle>Invoice Generated</DialogTitle>
            <DialogDescription>Sale completed successfully. Print or save the bill below.</DialogDescription>
          </DialogHeader>

          {saleResult && (
            <>
              <div ref={billRef}>
                <div className="bill">
                  <div className="header">
                    <h1>MedInventory</h1>
                    <p>Medicine Management System</p>
                    <p>{saleResult.branchName}</p>
                  </div>

                  <div className="info">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span><strong>Invoice:</strong> {saleResult.invoiceNumber}</span>
                      <span>{saleResult.date}</span>
                    </div>
                    {saleResult.customerName && (
                      <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                        <strong>Customer:</strong> {saleResult.customerName} {saleResult.customerPhone && `| ${saleResult.customerPhone}`}
                      </div>
                    )}
                    <div style={{ fontSize: "12px" }}>
                      <strong>Sold by:</strong> {saleResult.soldBy}
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #333" }}>
                        <th style={{ textAlign: "left", padding: "4px 2px" }}>Item</th>
                        <th style={{ textAlign: "right", padding: "4px 2px" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "4px 2px" }}>Price</th>
                        <th style={{ textAlign: "right", padding: "4px 2px" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleResult.items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px dashed #ddd" }}>
                          <td style={{ padding: "4px 2px" }}>{item.medicine.name}</td>
                          <td style={{ textAlign: "right", padding: "4px 2px" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right", padding: "4px 2px" }}>₹{item.unitPrice.toFixed(2)}</td>
                          <td style={{ textAlign: "right", padding: "4px 2px" }}>₹{item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="totals" style={{ borderTop: "2px dashed #333", paddingTop: "8px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>Subtotal</span>
                      <span>₹{saleResult.totalAmount.toFixed(2)}</span>
                    </div>
                    {saleResult.discount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "green" }}>
                        <span>Discount</span>
                        <span>-₹{saleResult.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px", borderTop: "1px solid #333", paddingTop: "6px", marginTop: "6px" }}>
                      <span>Net Total</span>
                      <span>₹{saleResult.netAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "6px" }}>
                      <span>Payment</span>
                      <span style={{ textTransform: "uppercase" }}>{saleResult.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="footer" style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "#888", borderTop: "2px dashed #333", paddingTop: "8px" }}>
                    <p>Thank you for your purchase!</p>
                    <p>Visit again 🙏</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" /> Print Bill
                </Button>
                {saleResult.customerPhone && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const phone = saleResult.customerPhone.replace(/\D/g, "");
                      const phoneNum = phone.startsWith("91") ? phone : `91${phone}`;
                      const items = saleResult.items.map(i => `${i.medicine.name} x${i.quantity} = ₹${i.totalPrice.toFixed(2)}`).join("\n");
                      const msg = `🧾 *MedInventory Invoice*\n📄 ${saleResult.invoiceNumber}\n📅 ${saleResult.date}\n🏪 ${saleResult.branchName}\n\n*Items:*\n${items}\n\n💰 Subtotal: ₹${saleResult.totalAmount.toFixed(2)}${saleResult.discount > 0 ? `\n🎁 Discount: -₹${saleResult.discount.toFixed(2)}` : ""}\n✅ *Total: ₹${saleResult.netAmount.toFixed(2)}*\n💳 Payment: ${saleResult.paymentMethod.toUpperCase()}\n\nThank you! 🙏`;
                      window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Bill
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
