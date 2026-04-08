export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(180deg, #0093DD 0%, #004163 100%)" }}
    >
      {children}
    </div>
  );
}
