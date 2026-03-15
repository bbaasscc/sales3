import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, UserPlus, Mail, Lock, User, Hash } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRAND_COLORS = {
  primary: '#C62828',
  primaryDark: '#8E0000',
  secondary: '#1E3A5F',
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", sales_number: "" });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (!form.email || !form.password || !form.name || !form.sales_number) {
          toast.error("All fields are required");
          setLoading(false);
          return;
        }
        if (!form.email.toLowerCase().endsWith("@fshac.com") && !form.email.toLowerCase().endsWith("@gmail.com")) {
          toast.error("Only @fshac.com or @gmail.com emails are allowed");
          setLoading(false);
          return;
        }
        if (form.password.length < 4) {
          toast.error("Password must be at least 4 characters");
          setLoading(false);
          return;
        }
        const res = await axios.post(`${API}/auth/register`, {
          email: form.email,
          name: form.name,
          sales_number: form.sales_number,
          password: form.password,
        });
        toast.success("Account created!");
        onLogin(res.data.token, res.data.user);
      } else {
        if (!form.email || !form.password) {
          toast.error("Email and password are required");
          setLoading(false);
          return;
        }
        const loginEmail = form.email.trim();
        const loginPass = form.password;
        const res = await axios.post(`${API}/auth/login`, {
          email: loginEmail,
          password: loginPass,
        });
        toast.success(`Welcome, ${res.data.user.name}`);
        onLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || "Connection error";
      toast.error(detail, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/7d8c38f9-ada4-4711-8896-4fc103fbde80/images/9a22c72164b9e3fa9ad33692cf44146d55855edbc17156258323d2188c87c86c.png"
            alt="The Salesman's Legend League"
            className="h-16 mx-auto mb-4 object-contain"
            data-testid="login-logo"
          />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND_COLORS.secondary }} data-testid="login-title">
            The Salesman's Legend League
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
          <CardContent className="p-6 sm:p-8">
            {/* Mode Toggle */}
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "login" ? "text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                }`}
                style={mode === "login" ? { backgroundColor: BRAND_COLORS.primary } : {}}
                data-testid="login-tab"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "register" ? "text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                }`}
                style={mode === "register" ? { backgroundColor: BRAND_COLORS.primary } : {}}
                data-testid="register-tab"
              >
                <UserPlus className="w-4 h-4" /> Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <Label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <User className="w-3.5 h-3.5" /> Full Name
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Benjamin S. Cardarelli"
                      className="h-11"
                      data-testid="register-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <Hash className="w-3.5 h-3.5" /> Sales Number
                    </Label>
                    <Input
                      value={form.sales_number}
                      onChange={(e) => set("sales_number", e.target.value)}
                      placeholder="10149"
                      className="h-11"
                      data-testid="register-sales-number"
                    />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@fshac.com"
                  className="h-11"
                  data-testid="login-email"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5" /> Password
                </Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Your password"
                  className="h-11"
                  data-testid="login-password"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-bold shadow-md rounded-xl"
                style={{ backgroundColor: BRAND_COLORS.primary }}
                data-testid="auth-submit"
              >
                {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            {mode === "register" && (
              <p className="text-[11px] text-gray-400 text-center mt-4">
                Only <strong>@fshac.com</strong> and <strong>@gmail.com</strong> emails are accepted
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
