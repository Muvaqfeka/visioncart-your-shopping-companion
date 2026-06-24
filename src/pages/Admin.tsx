import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, Video, Truck, Package, Home, LogOut } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  total: number;
  payment_method: string;
  payment_status: string;
  upi_txn_id: string | null;
  video_path: string | null;
  delivery_status: string;
  created_at: string;
  items: any;
}

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const staff = (roles ?? []).some((r) => r.role === "admin" || r.role === "worker");
    setIsStaff(staff);
    if (!staff) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const fetchVideo = async (order: Order) => {
    if (!order.video_path || videoUrls[order.id]) return;
    const { data, error } = await supabase.storage.from("payment-videos").createSignedUrl(order.video_path, 600);
    if (error) return toast.error(error.message);
    setVideoUrls((v) => ({ ...v, [order.id]: data.signedUrl }));
  };

  const verify = async (id: string, decision: "approve" | "reject") => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("verify-payment", {
      body: { order_id: id, decision },
    });
    if (res.error) return toast.error(res.error.message);
    toast.success(decision === "approve" ? "Payment approved" : "Payment rejected");
    load();
  };

  const advance = async (id: string, delivery_status: string) => {
    const res = await supabase.functions.invoke("verify-payment", {
      body: { order_id: id, delivery_status },
    });
    if (res.error) return toast.error(res.error.message);
    toast.success("Delivery status updated");
    load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) return <div className="min-h-screen aurora-bg flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!isStaff) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h1 className="font-display text-xl text-glow">Worker portal</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn't a worker or admin yet. Ask an admin to assign your role in the <code>user_roles</code> table, or sign in with a staff account.
          </p>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const pending = orders.filter((o) => o.payment_status === "awaiting_verification");
  const others = orders.filter((o) => o.payment_status !== "awaiting_verification");

  return (
    <div className="min-h-screen aurora-bg">
      <div className="container mx-auto max-w-5xl p-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl gradient-text text-glow flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" /> Worker Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Verify payments and advance deliveries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
          </div>
        </header>

        <Section title={`🔔 Awaiting verification (${pending.length})`} orders={pending} videoUrls={videoUrls} fetchVideo={fetchVideo} verify={verify} advance={advance} highlight />
        <Section title={`All orders (${others.length})`} orders={others} videoUrls={videoUrls} fetchVideo={fetchVideo} verify={verify} advance={advance} />
      </div>
    </div>
  );
}

function Section({ title, orders, videoUrls, fetchVideo, verify, advance, highlight }: {
  title: string;
  orders: Order[];
  videoUrls: Record<string, string>;
  fetchVideo: (o: Order) => void;
  verify: (id: string, d: "approve" | "reject") => void;
  advance: (id: string, s: string) => void;
  highlight?: boolean;
}) {
  return (
    <section className="mb-10">
      <h2 className={`font-display text-sm mb-3 ${highlight ? "text-primary text-glow" : "text-muted-foreground"}`}>{title}</h2>
      {orders.length === 0 && <p className="text-xs text-muted-foreground glass rounded-lg p-4">No orders.</p>}
      <div className="grid gap-3">
        {orders.map((o) => (
          <div key={o.id} className={`glass rounded-xl p-4 ${highlight ? "border border-primary/40 shadow-neon" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-display text-sm text-foreground">{o.customer_name} · <span className="text-muted-foreground">{o.phone}</span></p>
                <p className="text-[11px] text-muted-foreground font-mono">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("en-IN")}</p>
                {o.address && <p className="text-xs text-muted-foreground mt-1">📍 {o.address}</p>}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-primary text-glow">₹{Number(o.total).toLocaleString("en-IN")}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "failed" ? "destructive" : "secondary"}>{o.payment_status}</Badge>
                  <Badge variant="outline">{o.payment_method}</Badge>
                </div>
              </div>
            </div>

            {o.upi_txn_id && (
              <p className="text-xs mb-2"><span className="text-muted-foreground">UPI Txn ID:</span> <span className="font-mono text-primary">{o.upi_txn_id}</span></p>
            )}

            {o.video_path && (
              <div className="mb-3">
                {!videoUrls[o.id] ? (
                  <Button size="sm" variant="outline" onClick={() => fetchVideo(o)}><Video className="w-3 h-3 mr-1" /> Load verification video</Button>
                ) : (
                  <video src={videoUrls[o.id]} controls className="w-full max-w-sm rounded-lg" />
                )}
              </div>
            )}

            {o.payment_status === "awaiting_verification" && (
              <div className="flex gap-2 mb-2">
                <Button size="sm" onClick={() => verify(o.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => verify(o.id, "reject")}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
              </div>
            )}

            {o.payment_status === "paid" && o.delivery_status !== "delivered" && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="self-center">Status: {o.delivery_status}</Badge>
                {o.delivery_status === "placed" && <Button size="sm" variant="outline" onClick={() => advance(o.id, "packed")}><Package className="w-3 h-3 mr-1" /> Mark packed</Button>}
                {o.delivery_status === "packed" && <Button size="sm" variant="outline" onClick={() => advance(o.id, "out_for_delivery")}><Truck className="w-3 h-3 mr-1" /> Out for delivery</Button>}
                {o.delivery_status === "out_for_delivery" && <Button size="sm" variant="outline" onClick={() => advance(o.id, "delivered")}><Home className="w-3 h-3 mr-1" /> Delivered</Button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
