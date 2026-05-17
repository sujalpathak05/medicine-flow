import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer, Search, Loader2, Receipt } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printInvoice, type InvoiceData, type InvoiceSettings } from "@/lib/invoicePrint";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS: InvoiceSettings = {
  name: "Sharma Pharmacy",
  address: "", phone: "", gstin: "", email: "",
  tagline: "Your Trusted Health Partner",
  footer_note: "Thank you for your visit. Get well soon!",
};

interface SaleRow {
  id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  doctor_name: string | null;
  total_amount: number;
  discount: number;
  net_amount: number;
  cgst: number | null;
  sgst: number | null;
  gst_amount: number | null;
  payment_method: string;
  branch_id: string;
  sold_by: string;
}

export default function InvoicesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: br }, { data: pr }, { data: ps }] = await Promise.all([
        supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("branches").select("id,name"),
        supabase.from("profiles").select("user_id,full_name"),
        supabase.from("pharmacy_settings").select("*").limit(1).maybeSingle(),
      ]);
      setSales((s ?? []) as SaleRow[]);
      setBranches(Object.fromEntries((br ?? []).map((b: any) => [b.id, b.name])));
      setUsers(Object.fromEntries((pr ?? []).map((p: any) => [p.user_id, p.full_name])));
      if (ps) setSettings(ps as InvoiceSettings);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.created_at);
      if (from && d < from) return false;
      if (to) {
        const end = new Date(to); end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          s.invoice_number.toLowerCase().includes(q) ||
          (s.customer_name ?? "").toLowerCase().includes(q) ||
          (s.customer_phone ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sales, search, from, to]);

  const handleReprint = async (sale: SaleRow) => {
    setPrintingId(sale.id);
    try {
      const { data: items, error } = await supabase
        .from("sale_items").select("*").eq("sale_id", sale.id);
      if (error) throw error;
      const invoice: InvoiceData = {
        invoiceNumber: sale.invoice_number,
        date: new Date(sale.created_at).toLocaleString("en-IN"),
        branchName: branches[sale.branch_id] || "",
        soldBy: users[sale.sold_by] || "User",
        customerName: sale.customer_name ?? "",
        customerPhone: sale.customer_phone ?? "",
        doctorName: sale.doctor_name ?? "",
        items: (items ?? []).map((i: any) => ({
          name: i.medicine_name,
          hsnCode: i.hsn_code ?? "",
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          gstRate: Number(i.gst_rate ?? 12),
          totalPrice: Number(i.total_price),
        })),
        totalAmount: Number(sale.total_amount),
        discount: Number(sale.discount),
        cgst: Number(sale.cgst ?? 0),
        sgst: Number(sale.sgst ?? 0),
        gstAmount: Number(sale.gst_amount ?? 0),
        netAmount: Number(sale.net_amount),
        paymentMethod: sale.payment_method,
      };
      printInvoice(invoice, settings);
    } catch (e: any) {
      toast.error(e.message || "Reprint failed");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Invoices
          </h1>
          <p className="text-sm text-muted-foreground">Saved invoices — reprint or download anytime.</p>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice #, customer, phone"
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start", !from && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {from ? format(from, "dd MMM yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={from} onSelect={setFrom} /></PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start", !to && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {to ? format(to, "dd MMM yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={to} onSelect={setTo} /></PopoverContent>
              </Popover>
              {(from || to) && (
                <Button variant="ghost" onClick={() => { setFrom(undefined); setTo(undefined); }}>Clear</Button>
              )}
            </div>

            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell></TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.invoice_number}</TableCell>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <div className="text-sm">{s.customer_name || "-"}</div>
                        {s.customer_phone && <div className="text-[10px] text-muted-foreground">{s.customer_phone}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{branches[s.branch_id] || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">₹{Number(s.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs uppercase">{s.payment_method}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={printingId === s.id} onClick={() => handleReprint(s)}>
                          {printingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Printer className="h-3 w-3 mr-1" /> Print</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}