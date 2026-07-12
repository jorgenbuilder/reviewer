import type { Metadata } from "next";
import { AppContainer } from "@/components/app-container";

export const metadata: Metadata = {
  title: "Proposal Reviewer",
};

export default function Home() {
  return <AppContainer />;
}
