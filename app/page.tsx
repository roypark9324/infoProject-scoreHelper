import AuthGate from "./auth-gate";
import Dashboard from "./dashboard";

// 로그인한 뒤에만 Dashboard가 만들어져, 그때 DB에서 내 기록을 불러온다. (차시 8)
export default function HomePage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
