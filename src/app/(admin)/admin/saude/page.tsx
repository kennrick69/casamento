import type { Metadata } from "next";
import HealthDashboard from "./health-dashboard";

export const metadata: Metadata = { title: "Saúde do sistema" };

export default function SaudePage() {
  return <HealthDashboard />;
}
