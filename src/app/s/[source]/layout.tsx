import { notFound } from "next/navigation";
import { isEnabledSource } from "@/lib/sources";

interface Props { children: React.ReactNode; params: Promise<{ source: string }> }

export default async function SourceLayout({ children, params }: Props) {
  const { source } = await params;
  if (!isEnabledSource(source)) notFound();
  return <>{children}</>;
}
