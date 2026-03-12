import { Navbar } from "@/components/Navbar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex" }}>
      <Navbar />
      <main style={{ marginLeft: 52, flex: 1, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}