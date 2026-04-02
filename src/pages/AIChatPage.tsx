import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: AlertTriangle, text: "कौन सी medicines low stock में हैं?", color: "text-warning" },
  { icon: Clock, text: "अगले 30 दिनों में कौन सी medicines expire हो रही हैं?", color: "text-destructive" },
  { icon: TrendingUp, text: "Stock prediction दो - कौन सी medicines जल्दी reorder करनी चाहिए?", color: "text-primary" },
  { icon: Sparkles, text: "सबसे ज्यादा बिकने वाली medicines कौन सी हैं?", color: "text-green-500" },
];

export default function AIChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Fetch inventory context
      const [{ data: meds }, { data: sales }, { data: saleItems }] = await Promise.all([
        supabase.from("medicines").select("name, category, quantity, min_quantity, expiry_date, price, batch_number"),
        supabase.from("sales").select("invoice_number, net_amount, created_at, customer_name").order("created_at", { ascending: false }).limit(50),
        supabase.from("sale_items").select("medicine_name, quantity, total_price").limit(200),
      ]);

      const context = `
INVENTORY DATA:
Medicines (${meds?.length || 0} total):
${(meds || []).map(m => `- ${m.name}: qty=${m.quantity}, min=${m.min_quantity}, price=₹${m.price}, expiry=${m.expiry_date}, category=${m.category}`).join("\n")}

LOW STOCK (qty <= min_quantity):
${(meds || []).filter(m => m.quantity <= m.min_quantity).map(m => `- ${m.name}: ${m.quantity}/${m.min_quantity}`).join("\n") || "None"}

EXPIRING IN 30 DAYS:
${(meds || []).filter(m => new Date(m.expiry_date) <= new Date(Date.now() + 30 * 86400000)).map(m => `- ${m.name}: expires ${m.expiry_date}`).join("\n") || "None"}

RECENT SALES (last 50):
${(sales || []).map(s => `- ${s.invoice_number}: ₹${s.net_amount} on ${new Date(s.created_at).toLocaleDateString("en-IN")}`).join("\n") || "None"}

TOP SELLING:
${Object.entries((saleItems || []).reduce((acc: any, si) => { acc[si.medicine_name] = (acc[si.medicine_name] || 0) + si.quantity; return acc; }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => `- ${name}: ${qty} units sold`).join("\n") || "None"}
`;

      const allMessages = [
        ...messages,
        userMsg,
      ];

      const { data, error } = await supabase.functions.invoke("ai-inventory-assistant", {
        body: { messages: allMessages, context },
      });

      if (error) throw error;

      const assistantMsg: Message = { role: "assistant", content: data.reply || "Sorry, कुछ गलत हो गया।" };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      toast.error("AI response failed");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, अभी AI service उपलब्ध नहीं है। कृपया बाद में try करें।" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
        <div className="mb-4">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Inventory Assistant
          </h1>
          <p className="text-sm text-muted-foreground">Stock prediction, reorder alerts, expiry management - AI powered</p>
        </div>

        <Card className="glass-card flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 space-y-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-display font-semibold">AI Inventory Assistant</h2>
                  <p className="text-sm text-muted-foreground mt-1">Inventory से related कुछ भी पूछें</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <Button key={i} variant="outline" className="h-auto p-3 text-left justify-start" onClick={() => sendMessage(s.text)}>
                      <s.icon className={`h-4 w-4 mr-2 shrink-0 ${s.color}`} />
                      <span className="text-sm">{s.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      {msg.role === "assistant" && <Bot className="h-4 w-4 mb-1 text-primary" />}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="पूछें... e.g. 'कौन सी medicines reorder करनी चाहिए?'"
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
