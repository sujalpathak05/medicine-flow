import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

interface PharmacySettings {
  id?: string;
  name: string;
  address: string;
  phone: string;
  gstin: string;
  email: string;
  tagline: string;
  footer_note: string;
}

const DEFAULTS: PharmacySettings = {
  name: "Sharma Pharmacy",
  address: "",
  phone: "",
  gstin: "",
  email: "",
  tagline: "Your Trusted Health Partner",
  footer_note: "Thank you for your visit. Get well soon!",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("pharmacy_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data as PharmacySettings);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        const { error } = await supabase
          .from("pharmacy_settings")
          .update({
            name: settings.name,
            address: settings.address,
            phone: settings.phone,
            gstin: settings.gstin,
            email: settings.email,
            tagline: settings.tagline,
            footer_note: settings.footer_note,
          })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("pharmacy_settings")
          .insert({
            name: settings.name,
            address: settings.address,
            phone: settings.phone,
            gstin: settings.gstin,
            email: settings.email,
            tagline: settings.tagline,
            footer_note: settings.footer_note,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data as PharmacySettings);
      }
      toast.success("Settings saved! Invoice header updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
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
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Pharmacy Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Ye details GST invoice ke header me print/WhatsApp pe show hoongi.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg">Invoice Header Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pharmacy Name *</Label>
              <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} rows={2} maxLength={300} placeholder="Shop No., Street, City, State - PIN" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} maxLength={150} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={settings.gstin} onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })} maxLength={15} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-2">
              <Label>Footer Note</Label>
              <Textarea value={settings.footer_note} onChange={(e) => setSettings({ ...settings, footer_note: e.target.value })} rows={2} maxLength={200} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
