import { SourceHome } from "@/components/source-home";
import { type EnabledSourceId } from "@/lib/sources";

interface Props { params: Promise<{ source: EnabledSourceId }> }

export default async function Page({ params }: Props) {
  const { source } = await params;
  return <SourceHome source={source} />;
}
